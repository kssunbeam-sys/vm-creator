"""Command-line entry point.

    python -m vm_creator                      # open the GUI (loads ./config.yaml if present)
    python -m vm_creator gui -c my.yaml       # open the GUI with a specific config
    python -m vm_creator validate -c my.yaml  # check a config file without touching Azure
    python -m vm_creator create -c my.yaml    # create the VM described by a config file
    python -m vm_creator list -c my.yaml      # sign in and list subscriptions / groups / tags
"""

from __future__ import annotations

import argparse
import getpass
import json
import logging
import sys

from .config import PASSWORD_ENV_VAR, AppConfig, load_config, validate_config


def _load(path: str | None) -> AppConfig:
    return load_config(path) if path else AppConfig()


def _print_errors(errors: list[str]) -> None:
    print("The config has problems:", file=sys.stderr)
    for e in errors:
        print(f"  - {e}", file=sys.stderr)


def cmd_gui(args) -> int:
    try:
        from .gui import run
    except ImportError as exc:  # tkinter missing (e.g. some minimal Linux installs)
        print(f"Cannot start the GUI: {exc}\nOn Debian/Ubuntu install it with: sudo apt install python3-tk",
              file=sys.stderr)
        return 1
    run(args.config)
    return 0


def cmd_validate(args) -> int:
    cfg = _load(args.config)
    errors = validate_config(cfg)
    if errors:
        _print_errors(errors)
        return 1
    from .azure_ops import plan_resources

    print("Config OK. It would create:")
    for line in plan_resources(cfg):
        print(f"  - {line}")
    return 0


def cmd_create(args) -> int:
    from .azure_ops import AzureSession, plan_resources

    cfg = _load(args.config)
    if args.auth:
        cfg.auth.method = args.auth
    os_type = None
    try:
        os_type = cfg.effective_os_type()
    except ValueError:
        pass
    needs_password = os_type == "windows" or cfg.vm.auth_type == "password"
    if needs_password and not cfg.effective_password() and sys.stdin.isatty():
        cfg.vm.admin_password = getpass.getpass(f"Admin password for '{cfg.vm.admin_username}': ")
    errors = validate_config(cfg)
    if errors:
        _print_errors(errors)
        return 1

    print("This will create:")
    for line in plan_resources(cfg):
        print(f"  - {line}")
    if not args.yes and input("Continue? [y/N] ").strip().lower() not in ("y", "yes"):
        print("Aborted.")
        return 1

    session = AzureSession.sign_in(cfg.auth.method, cfg.auth.tenant_id, progress=print)
    result = session.create_vm(cfg, progress=print)
    print(json.dumps(result, indent=2))
    return 0


def cmd_list(args) -> int:
    from .azure_ops import AzureSession

    cfg = _load(args.config)
    method = args.auth or cfg.auth.method
    session = AzureSession.sign_in(method, cfg.auth.tenant_id, progress=print)
    for sub in session.subscriptions:
        print(f"\nSubscription: {sub.label}  [tenant {sub.tenant_id}]")
        if args.subscriptions_only:
            continue
        try:
            for g in session.list_resource_groups(sub):
                tags = ", ".join(f"{k}={v}" for k, v in g["tags"].items())
                print(f"  RG {g['name']:<40} {g['location']:<16} {tags}")
            tag_names = session.list_tag_names(sub)
            if tag_names:
                print("  Tag names in use: " + ", ".join(tag_names))
        except Exception as exc:  # keep going with the other subscriptions
            print(f"  (could not list: {exc})")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vm_creator", description="Create tagged Azure VMs.")
    sub = parser.add_subparsers(dest="command")

    def add(name, func, help_text, config_required=False):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("-c", "--config", required=config_required, help="path to a YAML config file")
        p.set_defaults(func=func)
        return p

    add("gui", cmd_gui, "open the graphical interface (default)")
    add("validate", cmd_validate, "check a config file offline", config_required=True)
    p = add("create", cmd_create, "create the VM described by a config file", config_required=True)
    p.add_argument("-y", "--yes", action="store_true", help="don't ask for confirmation")
    p.add_argument("--auth", choices=["browser", "cli", "device_code"], help="override auth.method")
    p = add("list", cmd_list, "sign in and list subscriptions, resource groups and tag names")
    p.add_argument("--auth", choices=["browser", "cli", "device_code"], help="override auth.method")
    p.add_argument("--subscriptions-only", action="store_true")
    parser.epilog = f"For Windows VMs / password auth you can set {PASSWORD_ENV_VAR} instead of typing the password."
    return parser


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    args = build_parser().parse_args(argv)
    if not args.command:
        args = build_parser().parse_args(["gui", *(argv or sys.argv[1:])])
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
