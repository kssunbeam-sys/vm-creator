import pytest

from vm_creator.config import AppConfig, ConfigError, load_config, save_config, validate_config, validate_tags
from vm_creator.images import resolve_image


@pytest.fixture
def ssh_key(tmp_path):
    key = tmp_path / "id.pub"
    key.write_text("ssh-ed25519 AAAAC3Nza test@example\n")
    return key


def good_config(ssh_key) -> AppConfig:
    return AppConfig.from_dict(
        {
            "subscription": "00000000-0000-0000-0000-000000000000",
            "resource_group": "rg-test",
            "location": "westeurope",
            "vm": {"name": "vm-test-01", "ssh_public_key_path": str(ssh_key)},
            "network": {"open_ports": [22]},
            "tags": {"Owner": "me", "Environment": "dev"},
            "required_tags": ["Owner", "Environment"],
        }
    )


def test_example_config_loads():
    cfg = load_config("config.example.yaml")
    assert cfg.vm.image == "ubuntu-24.04"
    assert cfg.required_tags == ["Owner", "Environment", "CostCenter"]
    assert cfg.network.open_ports == [22]


def test_valid_config_has_no_errors(ssh_key):
    assert validate_config(good_config(ssh_key)) == []


def test_round_trip_never_writes_password(tmp_path, ssh_key):
    cfg = good_config(ssh_key)
    cfg.vm.admin_password = "S3cret!Password"
    path = tmp_path / "out.yaml"
    save_config(cfg, path)
    assert "S3cret" not in path.read_text()
    again = load_config(path)
    assert again.tags == cfg.tags
    assert again.vm.name == cfg.vm.name
    assert again.vm.admin_password == ""


def test_unknown_keys_rejected():
    with pytest.raises(ConfigError):
        AppConfig.from_dict({"vm": {"nmae": "typo"}})
    with pytest.raises(ConfigError):
        AppConfig.from_dict({"resource_grop": "typo"})


def test_required_tags_must_have_values(ssh_key):
    cfg = good_config(ssh_key)
    cfg.tags["Owner"] = ""
    assert any("Required tag 'Owner'" in e for e in validate_config(cfg))
    # tag names are case-insensitive in Azure
    cfg.tags = {"owner": "x", "environment": "y"}
    assert validate_config(cfg) == []


@pytest.mark.parametrize(
    "tags, fragment",
    [
        ({"bad/key": "v"}, "forbidden"),
        ({"azure-thing": "v"}, "reserved prefix"),
        ({"Env": "a", "env": "b"}, "case-insensitive"),
        ({"k": "x" * 257}, "longer than 256"),
        ({f"k{i}": "v" for i in range(51)}, "at most 50"),
    ],
)
def test_tag_rules(tags, fragment):
    assert any(fragment in e for e in validate_tags(tags))


def test_windows_needs_strong_password_and_short_name(ssh_key, monkeypatch):
    monkeypatch.delenv("AZURE_VM_ADMIN_PASSWORD", raising=False)
    cfg = good_config(ssh_key)
    cfg.vm.image = "windows-server-2022"
    cfg.vm.name = "a-very-long-windows-name"
    errors = validate_config(cfg)
    assert any("15" in e for e in errors)
    assert any("password is required" in e for e in errors)
    cfg.vm.name = "win01"
    cfg.vm.admin_password = "short"
    assert any("12-123" in e for e in validate_config(cfg))
    monkeypatch.setenv("AZURE_VM_ADMIN_PASSWORD", "Very$trongPassw0rd")
    cfg.vm.admin_password = ""
    assert validate_config(cfg) == []


def test_missing_ssh_key(ssh_key):
    cfg = good_config(ssh_key)
    cfg.vm.ssh_public_key_path = str(ssh_key) + ".missing"
    assert any("not found" in e for e in validate_config(cfg))


def test_image_resolution():
    assert resolve_image("ubuntu-24.04").os_type == "linux"
    assert resolve_image("windows-server-2025").os_type == "windows"
    custom = resolve_image("MicrosoftWindowsDesktop:windows-11:win11-24h2-pro:latest")
    assert custom.os_type == "windows"
    assert resolve_image("Canonical:foo:bar:latest", "windows").os_type == "windows"
    with pytest.raises(ValueError):
        resolve_image("not-an-image")
