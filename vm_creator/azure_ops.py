"""Everything that talks to Azure: sign-in, discovery (subscriptions, resource
groups, regions, sizes, networks, tags) and VM creation.

The Azure SDK packages are imported lazily so that the config/validation code
(and its tests) work without them installed.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from .config import AppConfig
from .images import resolve_image

log = logging.getLogger(__name__)

ARM_SCOPE = "https://management.azure.com/.default"

ProgressFn = Callable[[str], None]


@dataclass
class Subscription:
    id: str
    name: str
    tenant_id: str
    state: str = ""

    @property
    def label(self) -> str:
        return f"{self.name} ({self.id})"


def _resource_client_cls():
    try:  # azure-mgmt-resource >= 26 split the package into sub-packages
        from azure.mgmt.resource.resources import ResourceManagementClient
    except ImportError:  # pragma: no cover - older SDKs
        from azure.mgmt.resource import ResourceManagementClient
    return ResourceManagementClient


def _subscription_client_cls():
    try:
        from azure.mgmt.subscription import SubscriptionClient
    except ImportError:  # pragma: no cover - older SDKs shipped it in azure-mgmt-resource
        from azure.mgmt.resource import SubscriptionClient
    return SubscriptionClient


class _TenantCredential:
    """Wraps a credential so every token is requested for one specific tenant.

    This lets a single sign-in reach subscriptions in all the tenants
    (directories) the account belongs to.
    """

    def __init__(self, inner, tenant_id: str):
        self._inner = inner
        self._tenant_id = tenant_id

    def get_token(self, *scopes, **kwargs):
        kwargs.setdefault("tenant_id", self._tenant_id)
        return self._inner.get_token(*scopes, **kwargs)


def make_credential(method: str, tenant_id: str = "", device_code_callback: ProgressFn | None = None):
    """Create an azure-identity credential for the chosen sign-in method."""
    from azure.identity import AzureCliCredential, DeviceCodeCredential, InteractiveBrowserCredential

    tenant = tenant_id or None
    if method == "browser":
        return InteractiveBrowserCredential(tenant_id=tenant, additionally_allowed_tenants=["*"])
    if method == "cli":
        return AzureCliCredential(tenant_id=tenant_id or "", additionally_allowed_tenants=["*"])
    if method == "device_code":

        def prompt(verification_uri, user_code, _expires_on):
            msg = f"To sign in, open {verification_uri} and enter the code {user_code}"
            (device_code_callback or log.warning)(msg)

        return DeviceCodeCredential(tenant_id=tenant, prompt_callback=prompt, additionally_allowed_tenants=["*"])
    raise ValueError(f"Unknown sign-in method: {method}")


class AzureSession:
    """A signed-in session. All methods are blocking; call them off the UI thread."""

    def __init__(self, credential, tenant_id: str = ""):
        self.credential = credential
        self.tenant_id = tenant_id
        self.subscriptions: list[Subscription] = []
        self._clients: dict[tuple[str, str], Any] = {}

    # ---- sign-in & subscriptions -------------------------------------------

    @classmethod
    def sign_in(cls, method: str, tenant_id: str = "", progress: ProgressFn | None = None) -> "AzureSession":
        progress = progress or log.info
        cred = make_credential(method, tenant_id, device_code_callback=progress)
        progress("Signing in to Azure..." + (" (a browser window will open)" if method == "browser" else ""))
        cred.get_token(ARM_SCOPE)  # forces the interactive login now
        session = cls(cred, tenant_id)
        session.refresh_subscriptions(progress)
        return session

    def refresh_subscriptions(self, progress: ProgressFn | None = None) -> list[Subscription]:
        progress = progress or log.info
        sub_client_cls = _subscription_client_cls()
        if self.tenant_id:
            tenants = [self.tenant_id]
        else:
            tenants = [t.tenant_id for t in sub_client_cls(self.credential).tenants.list()]
        subs: dict[str, Subscription] = {}
        for tenant in tenants:
            try:
                client = sub_client_cls(_TenantCredential(self.credential, tenant))
                for s in client.subscriptions.list():
                    subs.setdefault(
                        s.subscription_id,
                        Subscription(s.subscription_id, s.display_name, getattr(s, "tenant_id", None) or tenant,
                                     str(getattr(s, "state", "") or "")),
                    )
            except Exception as exc:  # e.g. tenant requires MFA / conditional access
                progress(f"Skipped tenant {tenant}: {_short_error(exc)}")
        self.subscriptions = sorted(subs.values(), key=lambda s: s.name.lower())
        progress(f"Found {len(self.subscriptions)} subscription(s).")
        return self.subscriptions

    def find_subscription(self, id_or_name: str) -> Subscription:
        key = (id_or_name or "").strip().lower()
        for s in self.subscriptions:
            if key in (s.id.lower(), s.name.lower(), s.label.lower()):
                return s
        raise LookupError(f"Subscription '{id_or_name}' not found (or you have no access to it).")

    # ---- clients -------------------------------------------------------------

    def _client(self, kind: str, sub: Subscription):
        key = (kind, sub.id)
        if key not in self._clients:
            cred = _TenantCredential(self.credential, sub.tenant_id) if sub.tenant_id else self.credential
            if kind == "resource":
                self._clients[key] = _resource_client_cls()(cred, sub.id)
            elif kind == "compute":
                from azure.mgmt.compute import ComputeManagementClient

                self._clients[key] = ComputeManagementClient(cred, sub.id)
            elif kind == "network":
                from azure.mgmt.network import NetworkManagementClient

                self._clients[key] = NetworkManagementClient(cred, sub.id)
            elif kind == "subscription":
                self._clients[key] = _subscription_client_cls()(cred)
            else:
                raise ValueError(kind)
        return self._clients[key]

    # ---- discovery -----------------------------------------------------------

    def list_resource_groups(self, sub: Subscription) -> list[dict]:
        rgs = self._client("resource", sub).resource_groups.list()
        return sorted(
            ({"name": g.name, "location": g.location, "tags": dict(g.tags or {})} for g in rgs),
            key=lambda g: g["name"].lower(),
        )

    def list_resources(self, sub: Subscription, resource_group: str) -> list[dict]:
        items = self._client("resource", sub).resources.list_by_resource_group(resource_group)
        return sorted(
            (
                {"name": r.name, "type": r.type, "location": r.location, "id": r.id, "tags": dict(r.tags or {})}
                for r in items
            ),
            key=lambda r: (r["type"].lower(), r["name"].lower()),
        )

    def list_locations(self, sub: Subscription) -> list[tuple[str, str]]:
        """Return [(name, display_name)] of physical regions."""
        out = []
        for loc in self._client("subscription", sub).subscriptions.list_locations(sub.id):
            region_type = getattr(getattr(loc, "metadata", None), "region_type", None)
            if region_type is not None and str(getattr(region_type, "value", region_type)).lower() != "physical":
                continue  # skip "logical" regions such as "asia" or "europe"
            out.append((loc.name, loc.display_name))
        return sorted(out, key=lambda x: x[1].lower())

    def list_vm_sizes(self, sub: Subscription, location: str) -> list[dict]:
        sizes = self._client("compute", sub).virtual_machine_sizes.list(location)
        return sorted(
            (
                {"name": s.name, "cores": s.number_of_cores, "memory_gb": round((s.memory_in_mb or 0) / 1024, 1)}
                for s in sizes
            ),
            key=lambda s: s["name"].lower(),
        )

    def list_vnets(self, sub: Subscription, location: str | None = None) -> list[dict]:
        out = []
        for v in self._client("network", sub).virtual_networks.list_all():
            if location and v.location != location:
                continue
            out.append(
                {
                    "name": v.name,
                    "resource_group": resource_group_from_id(v.id),
                    "location": v.location,
                    "subnets": [s.name for s in (v.subnets or [])],
                }
            )
        return sorted(out, key=lambda v: (v["name"].lower(), v["resource_group"].lower()))

    def list_tag_names(self, sub: Subscription) -> dict[str, list[str]]:
        """All tag names used in the subscription, with their known values."""
        out: dict[str, list[str]] = {}
        for t in self._client("resource", sub).tags.list():
            if t.tag_name.lower().startswith("hidden-"):
                continue
            out[t.tag_name] = sorted({v.tag_value for v in (t.values or []) if v.tag_value is not None})
        return dict(sorted(out.items(), key=lambda kv: kv[0].lower()))

    # ---- VM creation -------------------------------------------------------------

    def create_vm(self, cfg: AppConfig, progress: ProgressFn | None = None) -> dict:
        sub = self.find_subscription(cfg.subscription)
        return create_vm(
            cfg,
            resource=self._client("resource", sub),
            network=self._client("network", sub),
            compute=self._client("compute", sub),
            progress=progress,
        )


def resource_group_from_id(resource_id: str) -> str:
    parts = (resource_id or "").split("/")
    for i, p in enumerate(parts):
        if p.lower() == "resourcegroups" and i + 1 < len(parts):
            return parts[i + 1]
    return ""


def _short_error(exc: Exception) -> str:
    msg = getattr(exc, "message", None) or str(exc)
    return msg.strip().splitlines()[0][:300] if msg else type(exc).__name__


def _is_not_found(exc: Exception) -> bool:
    return getattr(exc, "status_code", None) == 404 or type(exc).__name__ == "ResourceNotFoundError"


def plan_resources(cfg: AppConfig) -> list[str]:
    """Human-readable list of what create_vm will create (used for the preview)."""
    vm = cfg.vm
    net = cfg.network
    lines = [f"Resource group '{cfg.resource_group}' in {cfg.location} (created if it does not exist)"]
    lines.append(
        f"Virtual network '{cfg.effective_vnet_name()}' in RG '{cfg.effective_vnet_resource_group()}' "
        f"(re-used if it exists, else created with {net.vnet_address_prefix}), subnet '{net.subnet_name}'"
    )
    if net.open_ports:
        lines.append(f"Network security group '{vm.name}-nsg' allowing ports {net.open_ports} from '{net.allowed_source}'")
    if net.public_ip:
        lines.append(f"Public IP '{vm.name}-ip' (Standard, static)")
    lines.append(f"Network interface '{vm.name}-nic'")
    image = resolve_image(vm.image, vm.os_type)
    lines.append(f"Virtual machine '{vm.name}' ({vm.size}, {image.urn}, {image.os_type})")
    lines.append(f"OS disk '{vm.name}-osdisk' ({vm.os_disk_type}{', %s GB' % vm.os_disk_size_gb if vm.os_disk_size_gb else ''})")
    lines.append("Tags applied to every resource above: " + (", ".join(f"{k}={v}" for k, v in cfg.tags.items()) or "(none)"))
    return lines


def create_vm(cfg: AppConfig, *, resource, network, compute, progress: ProgressFn | None = None) -> dict:
    """Create the VM and its supporting resources, tagging all of them.

    Takes already-built management clients so it can be unit-tested with fakes.
    """
    from azure.mgmt.compute import models as cm
    from azure.mgmt.network import models as nm

    progress = progress or log.info
    vm = cfg.vm
    net = cfg.network
    tags = dict(cfg.tags)
    rg, location = cfg.resource_group, cfg.location
    image = resolve_image(vm.image, vm.os_type)

    # 1. Resource group
    if resource.resource_groups.check_existence(rg):
        progress(f"Using existing resource group '{rg}'.")
    else:
        progress(f"Creating resource group '{rg}'...")
        resource.resource_groups.create_or_update(rg, {"location": location, "tags": tags})

    # 2. Virtual network + subnet
    vnet_rg, vnet_name = cfg.effective_vnet_resource_group(), cfg.effective_vnet_name()
    if vnet_rg != rg and not resource.resource_groups.check_existence(vnet_rg):
        progress(f"Creating resource group '{vnet_rg}' for the virtual network...")
        resource.resource_groups.create_or_update(vnet_rg, {"location": location, "tags": tags})
    try:
        vnet = network.virtual_networks.get(vnet_rg, vnet_name)
        progress(f"Using existing virtual network '{vnet_name}'.")
    except Exception as exc:
        if not _is_not_found(exc):
            raise
        progress(f"Creating virtual network '{vnet_name}' ({net.vnet_address_prefix})...")
        vnet = network.virtual_networks.begin_create_or_update(
            vnet_rg,
            vnet_name,
            nm.VirtualNetwork(
                location=location,
                tags=tags,
                address_space=nm.AddressSpace(address_prefixes=[net.vnet_address_prefix]),
                subnets=[nm.Subnet(name=net.subnet_name, address_prefix=net.subnet_address_prefix)],
            ),
        ).result()
    subnet = next((s for s in (vnet.subnets or []) if s.name == net.subnet_name), None)
    if subnet is None:
        progress(f"Creating subnet '{net.subnet_name}' ({net.subnet_address_prefix})...")
        subnet = network.subnets.begin_create_or_update(
            vnet_rg, vnet_name, net.subnet_name, nm.Subnet(address_prefix=net.subnet_address_prefix)
        ).result()

    # 3. Network security group (only if ports should be opened)
    nsg = None
    if net.open_ports:
        progress(f"Creating network security group '{vm.name}-nsg' (ports {net.open_ports})...")
        rules = [
            nm.SecurityRule(
                name=f"allow-{port}",
                protocol="Tcp",
                direction="Inbound",
                access="Allow",
                priority=1000 + i * 10,
                source_address_prefix=net.allowed_source,
                source_port_range="*",
                destination_address_prefix="*",
                destination_port_range=str(port),
            )
            for i, port in enumerate(net.open_ports)
        ]
        nsg = network.network_security_groups.begin_create_or_update(
            rg, f"{vm.name}-nsg", nm.NetworkSecurityGroup(location=location, tags=tags, security_rules=rules)
        ).result()

    # 4. Public IP
    pip = None
    if net.public_ip:
        progress(f"Creating public IP '{vm.name}-ip'...")
        pip = network.public_ip_addresses.begin_create_or_update(
            rg,
            f"{vm.name}-ip",
            nm.PublicIPAddress(
                location=location,
                tags=tags,
                sku=nm.PublicIPAddressSku(name="Standard"),
                public_ip_allocation_method="Static",
                public_ip_address_version="IPv4",
            ),
        ).result()

    # 5. NIC
    progress(f"Creating network interface '{vm.name}-nic'...")
    nic = network.network_interfaces.begin_create_or_update(
        rg,
        f"{vm.name}-nic",
        nm.NetworkInterface(
            location=location,
            tags=tags,
            network_security_group=nm.NetworkSecurityGroup(id=nsg.id) if nsg else None,
            ip_configurations=[
                nm.NetworkInterfaceIPConfiguration(
                    name="ipconfig1",
                    subnet=nm.Subnet(id=subnet.id),
                    private_ip_allocation_method="Dynamic",
                    public_ip_address=nm.PublicIPAddress(id=pip.id) if pip else None,
                )
            ],
        ),
    ).result()

    # 6. VM
    if image.os_type == "windows":
        os_profile = cm.OSProfile(
            computer_name=vm.name,
            admin_username=vm.admin_username,
            admin_password=cfg.effective_password(),
            windows_configuration=cm.WindowsConfiguration(enable_automatic_updates=True, provision_vm_agent=True),
        )
    elif vm.auth_type == "ssh":
        key = Path(os.path.expanduser(vm.ssh_public_key_path)).read_text(encoding="utf-8").strip()
        os_profile = cm.OSProfile(
            computer_name=vm.name,
            admin_username=vm.admin_username,
            linux_configuration=cm.LinuxConfiguration(
                disable_password_authentication=True,
                ssh=cm.SshConfiguration(
                    public_keys=[cm.SshPublicKey(path=f"/home/{vm.admin_username}/.ssh/authorized_keys", key_data=key)]
                ),
            ),
        )
    else:
        os_profile = cm.OSProfile(
            computer_name=vm.name,
            admin_username=vm.admin_username,
            admin_password=cfg.effective_password(),
            linux_configuration=cm.LinuxConfiguration(disable_password_authentication=False),
        )

    os_disk_name = f"{vm.name}-osdisk"
    params = cm.VirtualMachine(
        location=location,
        tags=tags,
        hardware_profile=cm.HardwareProfile(vm_size=vm.size),
        storage_profile=cm.StorageProfile(
            image_reference=cm.ImageReference(
                publisher=image.publisher, offer=image.offer, sku=image.sku, version=image.version
            ),
            os_disk=cm.OSDisk(
                name=os_disk_name,
                create_option="FromImage",
                caching="ReadWrite",
                delete_option="Delete",
                disk_size_gb=vm.os_disk_size_gb or None,
                managed_disk=cm.ManagedDiskParameters(storage_account_type=vm.os_disk_type),
            ),
        ),
        os_profile=os_profile,
        network_profile=cm.NetworkProfile(
            network_interfaces=[cm.NetworkInterfaceReference(id=nic.id, primary=True, delete_option="Delete")]
        ),
        diagnostics_profile=cm.DiagnosticsProfile(boot_diagnostics=cm.BootDiagnostics(enabled=True)),
        security_profile=(
            cm.SecurityProfile(
                security_type="TrustedLaunch",
                uefi_settings=cm.UefiSettings(secure_boot_enabled=True, v_tpm_enabled=True),
            )
            if vm.trusted_launch
            else None
        ),
    )
    progress(f"Creating virtual machine '{vm.name}' ({vm.size}) - this usually takes 1-3 minutes...")
    created = compute.virtual_machines.begin_create_or_update(rg, vm.name, params).result()

    # 7. The OS disk is created by Azure and does not inherit the VM's tags.
    if tags:
        progress(f"Tagging OS disk '{os_disk_name}'...")
        try:
            compute.disks.begin_update(rg, os_disk_name, cm.DiskUpdate(tags=tags)).result()
        except Exception as exc:  # the VM exists; don't fail the whole run over this
            progress(f"Warning: could not tag the OS disk: {_short_error(exc)}")

    public_ip = None
    if pip is not None:
        public_ip = network.public_ip_addresses.get(rg, f"{vm.name}-ip").ip_address
    private_ip = (nic.ip_configurations or [None])[0].private_ip_address if nic.ip_configurations else None
    result = {
        "vm_id": created.id,
        "name": vm.name,
        "resource_group": rg,
        "public_ip": public_ip,
        "private_ip": private_ip,
        "os_type": image.os_type,
    }
    host = public_ip or private_ip
    if host:
        result["connect"] = (
            f"mstsc /v:{host}" if image.os_type == "windows" else f"ssh {vm.admin_username}@{host}"
        )
    progress(f"Done! VM '{vm.name}' created. Public IP: {public_ip or '-'}  Private IP: {private_ip or '-'}")
    return result
