"""Exercise create_vm against fake management clients (no Azure access needed)."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

pytest.importorskip("azure.mgmt.compute")
pytest.importorskip("azure.mgmt.network")

from vm_creator.azure_ops import create_vm, plan_resources, resource_group_from_id  # noqa: E402
from vm_creator.config import AppConfig  # noqa: E402


class NotFound(Exception):
    status_code = 404


def poller(value):
    return SimpleNamespace(result=lambda: value)


def fake_clients(rg_exists=False, vnet=None):
    resource = MagicMock()
    resource.resource_groups.check_existence.return_value = rg_exists

    network = MagicMock()
    if vnet is None:
        network.virtual_networks.get.side_effect = NotFound()
    else:
        network.virtual_networks.get.return_value = vnet
    network.virtual_networks.begin_create_or_update.side_effect = lambda rg, name, p: poller(
        SimpleNamespace(subnets=[SimpleNamespace(name="default", id=f"/subnets/{name}/default")])
    )
    network.subnets.begin_create_or_update.side_effect = lambda rg, v, name, p: poller(SimpleNamespace(id=f"/subnets/{name}"))
    network.network_security_groups.begin_create_or_update.side_effect = lambda rg, n, p: poller(SimpleNamespace(id="/nsg"))
    network.public_ip_addresses.begin_create_or_update.side_effect = lambda rg, n, p: poller(SimpleNamespace(id="/pip"))
    network.public_ip_addresses.get.return_value = SimpleNamespace(ip_address="20.1.2.3")
    network.network_interfaces.begin_create_or_update.side_effect = lambda rg, n, p: poller(
        SimpleNamespace(id="/nic", ip_configurations=[SimpleNamespace(private_ip_address="10.0.0.4")])
    )

    compute = MagicMock()
    compute.virtual_machines.begin_create_or_update.side_effect = lambda rg, n, p: poller(SimpleNamespace(id="/vm"))
    compute.disks.begin_update.side_effect = lambda rg, n, p: poller(None)
    return resource, network, compute


@pytest.fixture
def cfg(tmp_path):
    key = tmp_path / "id.pub"
    key.write_text("ssh-ed25519 AAAA test\n")
    return AppConfig.from_dict(
        {
            "subscription": "sub",
            "resource_group": "rg1",
            "location": "westeurope",
            "vm": {"name": "vm1", "ssh_public_key_path": str(key)},
            "network": {"open_ports": [22], "allowed_source": "1.2.3.4/32"},
            "tags": {"Owner": "me", "CostCenter": "42"},
        }
    )


def test_create_vm_tags_everything(cfg):
    resource, network, compute = fake_clients()
    result = create_vm(cfg, resource=resource, network=network, compute=compute, progress=lambda m: None)

    tags = {"Owner": "me", "CostCenter": "42"}
    resource.resource_groups.create_or_update.assert_called_once_with("rg1", {"location": "westeurope", "tags": tags})
    assert network.virtual_networks.begin_create_or_update.call_args.args[2].tags == tags
    nsg = network.network_security_groups.begin_create_or_update.call_args.args[2]
    assert nsg.tags == tags
    assert nsg.security_rules[0].destination_port_range == "22"
    assert nsg.security_rules[0].source_address_prefix == "1.2.3.4/32"
    assert network.public_ip_addresses.begin_create_or_update.call_args.args[2].tags == tags
    assert network.network_interfaces.begin_create_or_update.call_args.args[2].tags == tags

    vm = compute.virtual_machines.begin_create_or_update.call_args.args[2]
    assert vm.tags == tags
    assert vm.hardware_profile.vm_size == "Standard_B2s"
    assert vm.os_profile.linux_configuration.ssh.public_keys[0].key_data == "ssh-ed25519 AAAA test"
    assert vm.storage_profile.image_reference.offer == "ubuntu-24_04-lts"
    disk_args = compute.disks.begin_update.call_args.args
    assert disk_args[1] == "vm1-osdisk" and disk_args[2].tags == tags

    assert result["public_ip"] == "20.1.2.3"
    assert result["connect"] == "ssh azureuser@20.1.2.3"


def test_existing_rg_and_vnet_are_reused(cfg):
    cfg.network.vnet_name = "shared-vnet"
    cfg.network.vnet_resource_group = "rg-net"
    cfg.network.subnet_name = "apps"
    cfg.network.open_ports = []
    cfg.network.public_ip = False
    vnet = SimpleNamespace(subnets=[SimpleNamespace(name="default", id="/x")])
    resource, network, compute = fake_clients(rg_exists=True, vnet=vnet)
    result = create_vm(cfg, resource=resource, network=network, compute=compute, progress=lambda m: None)

    resource.resource_groups.create_or_update.assert_not_called()
    network.virtual_networks.get.assert_called_once_with("rg-net", "shared-vnet")
    network.virtual_networks.begin_create_or_update.assert_not_called()
    assert network.subnets.begin_create_or_update.call_args.args[:3] == ("rg-net", "shared-vnet", "apps")
    network.network_security_groups.begin_create_or_update.assert_not_called()
    network.public_ip_addresses.begin_create_or_update.assert_not_called()
    assert result["public_ip"] is None
    assert result["connect"] == "ssh azureuser@10.0.0.4"


def test_windows_vm_uses_password(cfg):
    cfg.vm.image = "windows-server-2022"
    cfg.vm.admin_password = "Very$trongPassw0rd"
    resource, network, compute = fake_clients()
    result = create_vm(cfg, resource=resource, network=network, compute=compute, progress=lambda m: None)
    vm = compute.virtual_machines.begin_create_or_update.call_args.args[2]
    assert vm.os_profile.admin_password == "Very$trongPassw0rd"
    assert vm.os_profile.windows_configuration is not None
    assert result["connect"] == "mstsc /v:20.1.2.3"


def test_plan_mentions_tags(cfg):
    plan = "\n".join(plan_resources(cfg))
    assert "Owner=me" in plan and "vm1-nsg" in plan


def test_resource_group_from_id():
    rid = "/subscriptions/s/resourceGroups/My-RG/providers/Microsoft.Network/virtualNetworks/v"
    assert resource_group_from_id(rid) == "My-RG"
