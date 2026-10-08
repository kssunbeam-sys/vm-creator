"""Configuration model: load/save the YAML config file and validate it.

The same structure backs the GUI form and the headless CLI, so a config file
saved from the GUI can be replayed with ``python -m vm_creator create``.
"""

from __future__ import annotations

import os
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import yaml

from .images import resolve_image

PASSWORD_ENV_VAR = "AZURE_VM_ADMIN_PASSWORD"

AUTH_METHODS = ("browser", "cli", "device_code")
OS_DISK_TYPES = ("StandardSSD_LRS", "Standard_LRS", "Premium_LRS", "StandardSSD_ZRS", "Premium_ZRS")

# Azure tag rules: https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources
MAX_TAGS = 50
MAX_TAG_KEY_LEN = 512
MAX_TAG_VALUE_LEN = 256
TAG_KEY_FORBIDDEN_CHARS = set('<>%&\\?/')
TAG_KEY_RESERVED_PREFIXES = ("microsoft", "azure", "windows")

_VM_NAME_RE = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$")
_RG_NAME_RE = re.compile(r"^[-\w._()]+$")


@dataclass
class AuthConfig:
    method: str = "browser"
    tenant_id: str = ""


@dataclass
class VmConfig:
    name: str = ""
    size: str = "Standard_B2s"
    image: str = "ubuntu-24.04"
    os_type: str = ""  # "linux" / "windows"; only needed for custom image URNs
    admin_username: str = "azureuser"
    auth_type: str = "ssh"  # "ssh" or "password" (Windows always uses password)
    ssh_public_key_path: str = "~/.ssh/id_rsa.pub"
    admin_password: str = ""  # prefer the GUI prompt or the AZURE_VM_ADMIN_PASSWORD env var
    os_disk_type: str = "StandardSSD_LRS"
    os_disk_size_gb: int | None = None
    trusted_launch: bool = True


@dataclass
class NetworkConfig:
    vnet_name: str = ""
    vnet_resource_group: str = ""  # defaults to the VM's resource group
    vnet_address_prefix: str = "10.0.0.0/16"
    subnet_name: str = "default"
    subnet_address_prefix: str = "10.0.0.0/24"
    public_ip: bool = True
    open_ports: list[int] = field(default_factory=list)
    allowed_source: str = "*"


@dataclass
class AppConfig:
    auth: AuthConfig = field(default_factory=AuthConfig)
    subscription: str = ""  # subscription ID or display name
    resource_group: str = ""
    location: str = ""
    vm: VmConfig = field(default_factory=VmConfig)
    network: NetworkConfig = field(default_factory=NetworkConfig)
    tags: dict[str, str] = field(default_factory=dict)
    required_tags: list[str] = field(default_factory=list)

    # ---- (de)serialisation -------------------------------------------------

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "AppConfig":
        data = dict(data or {})
        cfg = cls(
            auth=_build(AuthConfig, data.pop("auth", None)),
            vm=_build(VmConfig, data.pop("vm", None)),
            network=_build(NetworkConfig, data.pop("network", None)),
            tags={str(k): "" if v is None else str(v) for k, v in (data.pop("tags", None) or {}).items()},
            required_tags=[str(t) for t in (data.pop("required_tags", None) or [])],
        )
        for key in ("subscription", "resource_group", "location"):
            if key in data:
                setattr(cfg, key, "" if data[key] is None else str(data.pop(key)))
        if data:
            raise ConfigError(f"Unknown config keys: {', '.join(sorted(data))}")
        cfg.network.open_ports = [int(p) for p in cfg.network.open_ports or []]
        if cfg.vm.os_disk_size_gb in ("", 0):
            cfg.vm.os_disk_size_gb = None
        return cfg

    def to_dict(self, include_password: bool = False) -> dict[str, Any]:
        data = asdict(self)
        if not include_password:
            data["vm"].pop("admin_password", None)
        return data

    # ---- convenience -------------------------------------------------------

    def effective_os_type(self) -> str:
        return resolve_image(self.vm.image, self.vm.os_type).os_type

    def effective_password(self) -> str:
        return self.vm.admin_password or os.environ.get(PASSWORD_ENV_VAR, "")

    def effective_vnet_name(self) -> str:
        return self.network.vnet_name or f"{self.vm.name}-vnet"

    def effective_vnet_resource_group(self) -> str:
        return self.network.vnet_resource_group or self.resource_group


class ConfigError(ValueError):
    pass


def _build(dc, data):
    data = dict(data or {})
    known = set(dc.__dataclass_fields__)
    unknown = set(data) - known
    if unknown:
        raise ConfigError(f"Unknown keys in '{dc.__name__}': {', '.join(sorted(unknown))}")
    return dc(**data)


def load_config(path: str | os.PathLike) -> AppConfig:
    with open(path, encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        raise ConfigError(f"{path}: top level must be a mapping")
    return AppConfig.from_dict(data)


def save_config(cfg: AppConfig, path: str | os.PathLike) -> None:
    """Write the config as YAML. The admin password is never written."""
    Path(path).write_text(
        yaml.safe_dump(cfg.to_dict(include_password=False), sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )


# ---- validation ------------------------------------------------------------


def validate_tags(tags: dict[str, str], required: list[str] | None = None) -> list[str]:
    errors: list[str] = []
    if len(tags) > MAX_TAGS:
        errors.append(f"Azure allows at most {MAX_TAGS} tags per resource (got {len(tags)}).")
    seen: dict[str, str] = {}
    for key, value in tags.items():
        if not key.strip():
            errors.append("Tag names cannot be empty.")
            continue
        lower = key.lower()
        if lower in seen:
            errors.append(f"Tag names are case-insensitive: '{key}' duplicates '{seen[lower]}'.")
        seen[lower] = key
        if len(key) > MAX_TAG_KEY_LEN:
            errors.append(f"Tag name '{key[:30]}...' is longer than {MAX_TAG_KEY_LEN} characters.")
        bad = sorted(TAG_KEY_FORBIDDEN_CHARS & set(key))
        if bad:
            errors.append(f"Tag name '{key}' contains forbidden characters: {' '.join(bad)}")
        if lower.startswith(TAG_KEY_RESERVED_PREFIXES):
            errors.append(f"Tag name '{key}' uses a reserved prefix (microsoft/azure/windows).")
        if len(value) > MAX_TAG_VALUE_LEN:
            errors.append(f"Value of tag '{key}' is longer than {MAX_TAG_VALUE_LEN} characters.")
    present = {k.lower(): v for k, v in tags.items()}
    for req in required or []:
        if not present.get(req.lower(), "").strip():
            errors.append(f"Required tag '{req}' is missing or empty.")
    return errors


def _password_errors(password: str, os_type: str) -> list[str]:
    lo, hi = (12, 123) if os_type == "windows" else (6, 72)
    if not (lo <= len(password) <= hi):
        return [f"Admin password must be {lo}-{hi} characters long."]
    classes = sum(
        [
            any(c.islower() for c in password),
            any(c.isupper() for c in password),
            any(c.isdigit() for c in password),
            any(not c.isalnum() for c in password),
        ]
    )
    if classes < 3:
        return ["Admin password needs 3 of: lowercase, uppercase, digit, special character."]
    return []


def validate_config(cfg: AppConfig) -> list[str]:
    """Return a list of human-readable problems (empty list = OK)."""
    errors: list[str] = []
    if cfg.auth.method not in AUTH_METHODS:
        errors.append(f"auth.method must be one of {', '.join(AUTH_METHODS)}.")
    if not cfg.subscription:
        errors.append("Subscription is required.")
    if not cfg.resource_group:
        errors.append("Resource group is required.")
    elif not _RG_NAME_RE.match(cfg.resource_group) or cfg.resource_group.endswith(".") or len(cfg.resource_group) > 90:
        errors.append("Resource group name may only use letters, digits, - _ . ( ) and must not end with '.'.")
    if not cfg.location:
        errors.append("Location (region) is required.")

    vm = cfg.vm
    try:
        os_type = cfg.effective_os_type()
    except ValueError as exc:
        errors.append(str(exc))
        os_type = "linux"

    max_len = 15 if os_type == "windows" else 64
    if not vm.name:
        errors.append("VM name is required.")
    elif not _VM_NAME_RE.match(vm.name) or len(vm.name) > max_len:
        errors.append(
            f"VM name must be 1-{max_len} letters/digits/hyphens and not start or end with a hyphen"
            + (" (Windows limit is 15 characters)." if os_type == "windows" else ".")
        )
    if not vm.size:
        errors.append("VM size is required.")
    if not vm.admin_username:
        errors.append("Admin username is required.")
    elif vm.admin_username.lower() in {"admin", "administrator", "root", "user", "guest", "test"}:
        errors.append(f"Admin username '{vm.admin_username}' is reserved by Azure.")
    if vm.os_disk_type not in OS_DISK_TYPES:
        errors.append(f"OS disk type must be one of {', '.join(OS_DISK_TYPES)}.")
    if vm.os_disk_size_gb is not None and not (30 <= int(vm.os_disk_size_gb) <= 4095):
        errors.append("OS disk size must be between 30 and 4095 GB (or empty for the image default).")

    use_ssh = os_type == "linux" and vm.auth_type == "ssh"
    if os_type == "linux" and vm.auth_type not in ("ssh", "password"):
        errors.append("vm.auth_type must be 'ssh' or 'password'.")
    if use_ssh:
        key_path = Path(os.path.expanduser(vm.ssh_public_key_path or ""))
        if not vm.ssh_public_key_path:
            errors.append("SSH public key path is required for SSH authentication.")
        elif not key_path.is_file():
            errors.append(f"SSH public key file not found: {key_path}")
    else:
        pw = cfg.effective_password()
        if not pw:
            errors.append(f"Admin password is required (enter it in the GUI or set {PASSWORD_ENV_VAR}).")
        else:
            errors.extend(_password_errors(pw, os_type))

    net = cfg.network
    for port in net.open_ports:
        if not (1 <= port <= 65535):
            errors.append(f"Invalid port {port}.")
    if net.open_ports and not net.allowed_source:
        errors.append("network.allowed_source is required when ports are opened (use '*' for anywhere).")

    errors.extend(validate_tags(cfg.tags, cfg.required_tags))
    return errors
