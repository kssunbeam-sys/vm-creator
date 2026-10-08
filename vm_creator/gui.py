"""Tkinter desktop GUI for creating tagged Azure VMs."""

from __future__ import annotations

import json
import os
import queue
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Any, Callable

from .azure_ops import AzureSession, Subscription, plan_resources
from .config import (
    AUTH_METHODS,
    OS_DISK_TYPES,
    PASSWORD_ENV_VAR,
    AppConfig,
    ConfigError,
    load_config,
    save_config,
    validate_config,
    validate_tags,
)
from .images import COMMON_IMAGES, resolve_image

AUTH_LABELS = {
    "browser": "Browser (interactive sign-in)",
    "cli": "Azure CLI (uses 'az login')",
    "device_code": "Device code (sign in on another device)",
}
PAD = {"padx": 4, "pady": 3}


class App(tk.Tk):
    def __init__(self, config_path: str | None = None):
        super().__init__()
        self.title("Azure VM Creator")
        self.geometry("1180x860")
        self.minsize(980, 700)

        self.session: AzureSession | None = None
        self.config_path: Path | None = None
        self.tag_catalog: dict[str, list[str]] = {}
        self.vnets: list[dict] = []
        self._vnet_by_label: dict[str, dict] = {}
        self._sizes: dict[str, dict] = {}
        self._sizes_location = ""
        self._rg_names: set[str] = set()
        self._browse_nodes: dict[str, tuple] = {}
        self._ui_queue: "queue.Queue[Callable[[], None]]" = queue.Queue()

        self._build_menu()
        self._build_signin_bar()
        paned = ttk.PanedWindow(self, orient=tk.VERTICAL)
        paned.pack(fill=tk.BOTH, expand=True, padx=6, pady=(0, 6))
        self.notebook = ttk.Notebook(paned)
        paned.add(self.notebook, weight=4)
        self._build_create_tab()
        self._build_browse_tab()
        self._build_log(paned)

        self.after(100, self._drain_ui_queue)

        cfg = AppConfig()
        if config_path is None and Path("config.yaml").is_file():
            config_path = "config.yaml"
        if config_path:
            try:
                cfg = load_config(config_path)
                self.config_path = Path(config_path)
                self.log(f"Loaded config from {Path(config_path).resolve()}")
            except Exception as exc:
                messagebox.showerror("Config error", f"Could not load {config_path}:\n{exc}")
        self.config_to_form(cfg)

    # ------------------------------------------------------------------ helpers

    def ui(self, fn: Callable[[], None]) -> None:
        """Schedule fn on the Tk thread (safe to call from worker threads)."""
        self._ui_queue.put(fn)

    def _drain_ui_queue(self) -> None:
        try:
            while True:
                self._ui_queue.get_nowait()()
        except queue.Empty:
            pass
        self.after(100, self._drain_ui_queue)

    def run_bg(self, work: Callable[[], Any], on_ok: Callable[[Any], None] | None = None,
               on_err: Callable[[Exception], None] | None = None, what: str = "") -> None:
        def worker():
            try:
                result = work()
            except Exception as exc:  # noqa: BLE001 - reported to the user
                def report(err=exc):
                    self.log(f"ERROR{' (' + what + ')' if what else ''}: {err}")
                    if on_err:
                        on_err(err)

                self.ui(report)
                return
            if on_ok:
                self.ui(lambda: on_ok(result))

        threading.Thread(target=worker, daemon=True).start()

    def log(self, msg: str) -> None:
        if threading.current_thread() is not threading.main_thread():
            self.ui(lambda: self.log(msg))
            return
        self.log_text.configure(state=tk.NORMAL)
        self.log_text.insert(tk.END, msg + "\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state=tk.DISABLED)

    def current_subscription(self) -> Subscription | None:
        if not self.session:
            return None
        try:
            return self.session.find_subscription(self.sub_var.get())
        except LookupError:
            return None

    # ------------------------------------------------------------------ layout

    def _build_menu(self) -> None:
        menubar = tk.Menu(self)
        filem = tk.Menu(menubar, tearoff=False)
        filem.add_command(label="Open config...", command=self.open_config)
        filem.add_command(label="Save config", command=self.save_config)
        filem.add_command(label="Save config as...", command=lambda: self.save_config(ask=True))
        filem.add_separator()
        filem.add_command(label="Exit", command=self.destroy)
        menubar.add_cascade(label="File", menu=filem)
        helpm = tk.Menu(menubar, tearoff=False)
        helpm.add_command(label="About", command=lambda: messagebox.showinfo(
            "Azure VM Creator",
            "Create tagged Azure VMs from a GUI or a YAML config file.\n\n"
            "Headless use:  python -m vm_creator create -c config.yaml"))
        menubar.add_cascade(label="Help", menu=helpm)
        self.config(menu=menubar)

    def _build_signin_bar(self) -> None:
        bar = ttk.LabelFrame(self, text="Azure sign-in")
        bar.pack(fill=tk.X, padx=6, pady=6)
        ttk.Label(bar, text="Method:").grid(row=0, column=0, **PAD)
        self.auth_var = tk.StringVar(value=AUTH_LABELS["browser"])
        ttk.Combobox(bar, textvariable=self.auth_var, values=[AUTH_LABELS[m] for m in AUTH_METHODS],
                     state="readonly", width=36).grid(row=0, column=1, **PAD)
        ttk.Label(bar, text="Tenant ID (optional):").grid(row=0, column=2, **PAD)
        self.tenant_var = tk.StringVar()
        ttk.Entry(bar, textvariable=self.tenant_var, width=38).grid(row=0, column=3, **PAD)
        self.signin_btn = ttk.Button(bar, text="Sign in", command=self.sign_in)
        self.signin_btn.grid(row=0, column=4, **PAD)
        self.signin_status = ttk.Label(bar, text="Not signed in", foreground="#a33")
        self.signin_status.grid(row=0, column=5, sticky="w", **PAD)
        bar.columnconfigure(5, weight=1)

    def _build_log(self, paned: ttk.PanedWindow) -> None:
        frame = ttk.LabelFrame(paned, text="Activity log")
        paned.add(frame, weight=1)
        self.log_text = tk.Text(frame, height=7, state=tk.DISABLED, wrap="word")
        sb = ttk.Scrollbar(frame, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=sb.set)
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

    # ---- Create VM tab -------------------------------------------------------

    def _build_create_tab(self) -> None:
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Create VM")
        left = ttk.Frame(tab)
        right = ttk.Frame(tab)
        left.grid(row=0, column=0, sticky="nsew", padx=4, pady=4)
        right.grid(row=0, column=1, sticky="nsew", padx=4, pady=4)
        tab.columnconfigure(0, weight=1)
        tab.columnconfigure(1, weight=1)
        tab.rowconfigure(0, weight=1)

        # -- Where
        where = ttk.LabelFrame(left, text="Where")
        where.pack(fill=tk.X, pady=(0, 6))
        self.sub_var = tk.StringVar()
        self.rg_var = tk.StringVar()
        self.loc_var = tk.StringVar()
        self.sub_combo = self._row(where, 0, "Subscription", ttk.Combobox(where, textvariable=self.sub_var, width=48))
        self.sub_combo.bind("<<ComboboxSelected>>", lambda e: self.on_subscription_changed())
        self.rg_combo = self._row(where, 1, "Resource group", ttk.Combobox(where, textvariable=self.rg_var, width=48))
        self.rg_hint = ttk.Label(where, foreground="#666")
        self.rg_hint.grid(row=1, column=2, sticky="w")
        self.rg_var.trace_add("write", lambda *_: self._update_rg_hint())
        self.rg_combo.bind("<<ComboboxSelected>>", lambda e: self.on_rg_selected())
        self.loc_combo = self._row(where, 2, "Region", ttk.Combobox(where, textvariable=self.loc_var, width=48))
        self.loc_combo.bind("<<ComboboxSelected>>", lambda e: self.on_location_changed())
        self.loc_combo.bind("<FocusOut>", lambda e: self.on_location_changed(only_if_changed=True))
        self.loc_hint = ttk.Label(where, foreground="#666")
        self.loc_hint.grid(row=2, column=2, sticky="w")

        # -- VM
        vmf = ttk.LabelFrame(left, text="Virtual machine")
        vmf.pack(fill=tk.X, pady=(0, 6))
        self.vm_name_var = tk.StringVar()
        self.size_var = tk.StringVar()
        self.image_var = tk.StringVar()
        self.os_type_var = tk.StringVar(value="auto")
        self.user_var = tk.StringVar()
        self.auth_type_var = tk.StringVar(value="ssh")
        self.key_var = tk.StringVar()
        self.pw_var = tk.StringVar()
        self.disk_type_var = tk.StringVar()
        self.disk_size_var = tk.StringVar()
        self.tl_var = tk.BooleanVar(value=True)

        self._row(vmf, 0, "VM name", ttk.Entry(vmf, textvariable=self.vm_name_var, width=40))
        self.size_combo = self._row(vmf, 1, "Size", ttk.Combobox(vmf, textvariable=self.size_var, width=40))
        self.size_hint = ttk.Label(vmf, foreground="#666")
        self.size_hint.grid(row=1, column=2, sticky="w")
        self.size_var.trace_add("write", lambda *_: self._update_size_hint())
        img = self._row(vmf, 2, "Image", ttk.Combobox(vmf, textvariable=self.image_var, width=40,
                                                      values=list(COMMON_IMAGES)))
        img.bind("<<ComboboxSelected>>", lambda e: self._update_auth_widgets())
        self.image_var.trace_add("write", lambda *_: self._update_auth_widgets())
        ttk.Label(vmf, text="(alias or publisher:offer:sku:version)", foreground="#666").grid(row=2, column=2, sticky="w")
        os_combo = self._row(vmf, 3, "OS type", ttk.Combobox(vmf, textvariable=self.os_type_var, state="readonly",
                                                             width=12, values=["auto", "linux", "windows"]))
        os_combo.bind("<<ComboboxSelected>>", lambda e: self._update_auth_widgets())
        self._row(vmf, 4, "Admin username", ttk.Entry(vmf, textvariable=self.user_var, width=40))
        authf = ttk.Frame(vmf)
        self._row(vmf, 5, "Authentication", authf)
        self.ssh_radio = ttk.Radiobutton(authf, text="SSH key", value="ssh", variable=self.auth_type_var,
                                         command=self._update_auth_widgets)
        self.ssh_radio.pack(side=tk.LEFT)
        ttk.Radiobutton(authf, text="Password", value="password", variable=self.auth_type_var,
                        command=self._update_auth_widgets).pack(side=tk.LEFT)
        keyf = ttk.Frame(vmf)
        self._row(vmf, 6, "SSH public key", keyf)
        self.key_entry = ttk.Entry(keyf, textvariable=self.key_var, width=32)
        self.key_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.key_btn = ttk.Button(keyf, text="Browse...", command=self.browse_key)
        self.key_btn.pack(side=tk.LEFT, padx=(4, 0))
        self.pw_entry = self._row(vmf, 7, "Password", ttk.Entry(vmf, textvariable=self.pw_var, show="*", width=40))
        ttk.Label(vmf, text="(never saved to the config file)", foreground="#666").grid(row=7, column=2, sticky="w")
        self._row(vmf, 8, "OS disk type", ttk.Combobox(vmf, textvariable=self.disk_type_var, state="readonly",
                                                       values=list(OS_DISK_TYPES), width=20))
        self._row(vmf, 9, "OS disk size (GB)", ttk.Entry(vmf, textvariable=self.disk_size_var, width=10))
        ttk.Label(vmf, text="(empty = image default)", foreground="#666").grid(row=9, column=2, sticky="w")
        ttk.Checkbutton(vmf, text="Trusted launch (secure boot + vTPM)", variable=self.tl_var).grid(
            row=10, column=1, columnspan=2, sticky="w", **PAD)

        # -- Network
        netf = ttk.LabelFrame(right, text="Network")
        netf.pack(fill=tk.X, pady=(0, 6))
        self.vnet_var = tk.StringVar()
        self.vnet_rg_var = tk.StringVar()
        self.vnet_prefix_var = tk.StringVar()
        self.subnet_var = tk.StringVar()
        self.subnet_prefix_var = tk.StringVar()
        self.pip_var = tk.BooleanVar(value=True)
        self.ports_var = tk.StringVar()
        self.source_var = tk.StringVar()
        self.vnet_combo = self._row(netf, 0, "Virtual network", ttk.Combobox(netf, textvariable=self.vnet_var, width=36))
        self.vnet_combo.bind("<<ComboboxSelected>>", lambda e: self.on_vnet_selected())
        ttk.Label(netf, text="(pick existing or type a new name;\n empty = '<vm>-vnet')", foreground="#666").grid(
            row=0, column=2, sticky="w")
        self._row(netf, 1, "VNet resource group", ttk.Entry(netf, textvariable=self.vnet_rg_var, width=36))
        ttk.Label(netf, text="(empty = VM's group)", foreground="#666").grid(row=1, column=2, sticky="w")
        self._row(netf, 2, "VNet address space", ttk.Entry(netf, textvariable=self.vnet_prefix_var, width=36))
        self.subnet_combo = self._row(netf, 3, "Subnet", ttk.Combobox(netf, textvariable=self.subnet_var, width=36))
        self._row(netf, 4, "Subnet prefix", ttk.Entry(netf, textvariable=self.subnet_prefix_var, width=36))
        ttk.Label(netf, text="(used only for new subnets)", foreground="#666").grid(row=4, column=2, sticky="w")
        ttk.Checkbutton(netf, text="Public IP address", variable=self.pip_var).grid(row=5, column=1, sticky="w", **PAD)
        self._row(netf, 6, "Open inbound ports", ttk.Entry(netf, textvariable=self.ports_var, width=36))
        ttk.Label(netf, text="e.g. 22 or 3389, 443", foreground="#666").grid(row=6, column=2, sticky="w")
        self._row(netf, 7, "Allowed source", ttk.Entry(netf, textvariable=self.source_var, width=36))
        ttk.Label(netf, text="your IP/CIDR is safer than *", foreground="#666").grid(row=7, column=2, sticky="w")

        # -- Tags
        tagf = ttk.LabelFrame(right, text="Tags (applied to the VM and every resource it creates)")
        tagf.pack(fill=tk.BOTH, expand=True)
        self.tag_tree = ttk.Treeview(tagf, columns=("key", "value", "req"), show="headings", height=7)
        for col, title, width in (("key", "Name", 160), ("value", "Value", 220), ("req", "Required", 70)):
            self.tag_tree.heading(col, text=title)
            self.tag_tree.column(col, width=width, stretch=col != "req")
        self.tag_tree.grid(row=0, column=0, columnspan=4, sticky="nsew", **PAD)
        self.tag_tree.bind("<<TreeviewSelect>>", lambda e: self.on_tag_selected())
        tagf.rowconfigure(0, weight=1)
        tagf.columnconfigure(1, weight=1)
        tagf.columnconfigure(3, weight=1)
        self.tag_key_var = tk.StringVar()
        self.tag_val_var = tk.StringVar()
        ttk.Label(tagf, text="Name").grid(row=1, column=0, sticky="e", **PAD)
        self.tag_key_combo = ttk.Combobox(tagf, textvariable=self.tag_key_var)
        self.tag_key_combo.grid(row=1, column=1, sticky="ew", **PAD)
        self.tag_key_combo.bind("<<ComboboxSelected>>", lambda e: self._update_tag_value_choices())
        self.tag_key_var.trace_add("write", lambda *_: self._update_tag_value_choices())
        ttk.Label(tagf, text="Value").grid(row=1, column=2, sticky="e", **PAD)
        self.tag_val_combo = ttk.Combobox(tagf, textvariable=self.tag_val_var)
        self.tag_val_combo.grid(row=1, column=3, sticky="ew", **PAD)
        self.tag_val_combo.bind("<Return>", lambda e: self.add_tag())
        btns = ttk.Frame(tagf)
        btns.grid(row=2, column=0, columnspan=4, sticky="w", **PAD)
        ttk.Button(btns, text="Add / update tag", command=self.add_tag).pack(side=tk.LEFT)
        ttk.Button(btns, text="Remove selected", command=self.remove_tag).pack(side=tk.LEFT, padx=4)
        ttk.Label(btns, text="Names/values already used in the subscription are suggested.",
                  foreground="#666").pack(side=tk.LEFT, padx=6)
        self.req_var = tk.StringVar()
        ttk.Label(tagf, text="Required tags").grid(row=3, column=0, sticky="e", **PAD)
        req_entry = ttk.Entry(tagf, textvariable=self.req_var)
        req_entry.grid(row=3, column=1, columnspan=3, sticky="ew", **PAD)
        req_entry.bind("<FocusOut>", lambda e: self._sync_required_tags())
        req_entry.bind("<Return>", lambda e: self._sync_required_tags())

        # -- Actions
        actions = ttk.Frame(tab)
        actions.grid(row=1, column=0, columnspan=2, sticky="ew", padx=4, pady=(2, 6))
        ttk.Button(actions, text="Open config...", command=self.open_config).pack(side=tk.LEFT)
        ttk.Button(actions, text="Save config", command=self.save_config).pack(side=tk.LEFT, padx=4)
        ttk.Button(actions, text="Save config as...", command=lambda: self.save_config(ask=True)).pack(side=tk.LEFT)
        self.create_btn = ttk.Button(actions, text="Create VM", command=self.create_vm)
        self.create_btn.pack(side=tk.RIGHT)
        ttk.Button(actions, text="Validate", command=self.validate).pack(side=tk.RIGHT, padx=4)

    def _row(self, parent, row: int, label: str, widget):
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="e", **PAD)
        widget.grid(row=row, column=1, sticky="ew", **PAD)
        parent.columnconfigure(1, weight=1)
        return widget

    # ---- Browse tab --------------------------------------------------------------

    def _build_browse_tab(self) -> None:
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Browse my Azure resources")
        top = ttk.Frame(tab)
        top.pack(fill=tk.X, padx=4, pady=4)
        ttk.Button(top, text="Refresh", command=self.populate_browse_tree).pack(side=tk.LEFT)
        ttk.Button(top, text="Copy tags to new VM", command=self.copy_tags_from_browse).pack(side=tk.LEFT, padx=4)
        ttk.Button(top, text="Use this subscription / group for new VM",
                   command=self.use_browse_selection).pack(side=tk.LEFT)
        ttk.Label(top, text="Expand a subscription to see its resource groups, and a group to see its resources.",
                  foreground="#666").pack(side=tk.LEFT, padx=8)

        paned = ttk.PanedWindow(tab, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        treef = ttk.Frame(paned)
        paned.add(treef, weight=3)
        self.browse_tree = ttk.Treeview(treef, columns=("type", "location", "tags"))
        self.browse_tree.heading("#0", text="Name")
        self.browse_tree.heading("type", text="Type")
        self.browse_tree.heading("location", text="Location")
        self.browse_tree.heading("tags", text="Tags")
        self.browse_tree.column("#0", width=280)
        self.browse_tree.column("type", width=220)
        self.browse_tree.column("location", width=100, stretch=False)
        self.browse_tree.column("tags", width=320)
        sb = ttk.Scrollbar(treef, command=self.browse_tree.yview)
        self.browse_tree.configure(yscrollcommand=sb.set)
        self.browse_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.browse_tree.bind("<<TreeviewOpen>>", self.on_browse_open)
        self.browse_tree.bind("<<TreeviewSelect>>", lambda e: self.on_browse_select())

        detf = ttk.LabelFrame(paned, text="Details")
        paned.add(detf, weight=1)
        self.detail_text = tk.Text(detf, width=40, wrap="word", state=tk.DISABLED)
        self.detail_text.pack(fill=tk.BOTH, expand=True)

    # ------------------------------------------------------------------ sign-in

    def _auth_method(self) -> str:
        label = self.auth_var.get()
        return next((m for m, lab in AUTH_LABELS.items() if lab == label), "browser")

    def sign_in(self) -> None:
        method, tenant = self._auth_method(), self.tenant_var.get().strip()
        self.signin_btn.configure(state=tk.DISABLED)
        self.signin_status.configure(text="Signing in...", foreground="#a60")

        def done(session: AzureSession):
            self.session = session
            self.signin_btn.configure(state=tk.NORMAL, text="Sign in again")
            n = len(session.subscriptions)
            self.signin_status.configure(text=f"Signed in ({n} subscriptions)", foreground="#282")
            labels = [s.label for s in session.subscriptions]
            self.sub_combo.configure(values=labels)
            wanted = self.sub_var.get()
            try:
                self.sub_var.set(session.find_subscription(wanted).label if wanted else labels[0])
            except (LookupError, IndexError):
                if wanted:
                    self.log(f"Subscription '{wanted}' from the config was not found; pick one from the list.")
                self.sub_var.set(labels[0] if labels else "")
            self.populate_browse_tree()
            if self.sub_var.get():
                self.on_subscription_changed()

        def failed(_exc):
            self.signin_btn.configure(state=tk.NORMAL)
            self.signin_status.configure(text="Sign-in failed (see log)", foreground="#a33")

        self.run_bg(lambda: AzureSession.sign_in(method, tenant, progress=self.log), done, failed, "sign-in")

    # ------------------------------------------------------------------ discovery

    def on_subscription_changed(self) -> None:
        sub = self.current_subscription()
        if not sub:
            return
        self.log(f"Loading resource groups, regions, networks and tags for '{sub.name}'...")

        def work():
            s = self.session
            return {
                "rgs": s.list_resource_groups(sub),
                "locations": s.list_locations(sub),
                "vnets": s.list_vnets(sub),
                "tags": s.list_tag_names(sub),
            }

        def done(data):
            if self.current_subscription() != sub:
                return  # user switched subscription meanwhile
            self._rgs = {g["name"]: g for g in data["rgs"]}
            self._rg_names = {g["name"].lower() for g in data["rgs"]}
            self.rg_combo.configure(values=[g["name"] for g in data["rgs"]])
            self._locations = dict(data["locations"])
            self.loc_combo.configure(values=[name for name, _ in data["locations"]])
            self.vnets = data["vnets"]
            self.tag_catalog = data["tags"]
            self.tag_key_combo.configure(values=list(self.tag_catalog))
            self._update_rg_hint()
            self.log(f"{len(data['rgs'])} resource group(s), {len(data['locations'])} regions, "
                     f"{len(data['vnets'])} virtual network(s), {len(data['tags'])} tag name(s) in use.")
            self.on_location_changed()

        self.run_bg(work, done, what="loading subscription")

    def on_rg_selected(self) -> None:
        g = getattr(self, "_rgs", {}).get(self.rg_var.get())
        if g and not self.loc_var.get():
            self.loc_var.set(g["location"])
            self.on_location_changed()

    def on_location_changed(self, only_if_changed: bool = False) -> None:
        loc = self.loc_var.get().strip()
        if only_if_changed and loc == self._sizes_location:
            return
        self._sizes_location = loc
        self.loc_hint.configure(text=getattr(self, "_locations", {}).get(loc, ""))
        self._refresh_vnet_choices()
        sub = self.current_subscription()
        if not (sub and loc):
            return

        def done(sizes):
            self._sizes = {s["name"]: s for s in sizes}
            self.size_combo.configure(values=list(self._sizes))
            self._update_size_hint()
            self.log(f"{len(sizes)} VM sizes available in {loc}.")

        self.run_bg(lambda: self.session.list_vm_sizes(sub, loc), done, what=f"listing VM sizes in {loc}")

    def _refresh_vnet_choices(self) -> None:
        loc = self.loc_var.get().strip()
        self._vnet_by_label = {
            f"{v['name']}  [{v['resource_group']}]": v for v in self.vnets if not loc or v["location"] == loc
        }
        self.vnet_combo.configure(values=list(self._vnet_by_label))

    def on_vnet_selected(self) -> None:
        v = self._vnet_by_label.get(self.vnet_var.get())
        if not v:
            return
        self.vnet_rg_var.set(v["resource_group"])
        self.subnet_combo.configure(values=v["subnets"])
        if v["subnets"] and self.subnet_var.get() not in v["subnets"]:
            self.subnet_var.set(v["subnets"][0])

    def _update_rg_hint(self) -> None:
        name = self.rg_var.get().strip()
        if not name or not self.session:
            self.rg_hint.configure(text="")
        elif name.lower() in self._rg_names:
            self.rg_hint.configure(text="existing", foreground="#282")
        else:
            self.rg_hint.configure(text="will be created", foreground="#a60")

    def _update_size_hint(self) -> None:
        s = self._sizes.get(self.size_var.get())
        self.size_hint.configure(text=f"{s['cores']} vCPU, {s['memory_gb']} GB RAM" if s else "")

    def _update_auth_widgets(self) -> None:
        try:
            forced = "" if self.os_type_var.get() == "auto" else self.os_type_var.get()
            os_type = resolve_image(self.image_var.get(), forced).os_type
        except ValueError:
            os_type = "linux"
        if os_type == "windows":
            self.auth_type_var.set("password")
            self.ssh_radio.configure(state=tk.DISABLED)
        else:
            self.ssh_radio.configure(state=tk.NORMAL)
        ssh = self.auth_type_var.get() == "ssh"
        self.key_entry.configure(state=tk.NORMAL if ssh else tk.DISABLED)
        self.key_btn.configure(state=tk.NORMAL if ssh else tk.DISABLED)
        self.pw_entry.configure(state=tk.DISABLED if ssh else tk.NORMAL)

    def browse_key(self) -> None:
        path = filedialog.askopenfilename(
            title="Select SSH public key", initialdir=os.path.expanduser("~/.ssh"),
            filetypes=[("Public keys", "*.pub"), ("All files", "*")])
        if path:
            self.key_var.set(path)

    # ------------------------------------------------------------------ tags

    def _tags_from_tree(self) -> dict[str, str]:
        return {self.tag_tree.set(i, "key"): self.tag_tree.set(i, "value") for i in self.tag_tree.get_children()}

    def _required_list(self) -> list[str]:
        return [t.strip() for t in self.req_var.get().split(",") if t.strip()]

    def _set_tags(self, tags: dict[str, str]) -> None:
        self.tag_tree.delete(*self.tag_tree.get_children())
        for k, v in tags.items():
            self.tag_tree.insert("", tk.END, values=(k, v, ""))
        self._sync_required_tags()

    def _sync_required_tags(self) -> None:
        """Make sure every required tag has a row, and mark required rows."""
        required = {t.lower() for t in self._required_list()}
        existing = {self.tag_tree.set(i, "key").lower() for i in self.tag_tree.get_children()}
        for t in self._required_list():
            if t.lower() not in existing:
                self.tag_tree.insert("", tk.END, values=(t, "", ""))
                existing.add(t.lower())
        for i in self.tag_tree.get_children():
            self.tag_tree.set(i, "req", "yes" if self.tag_tree.set(i, "key").lower() in required else "")

    def on_tag_selected(self) -> None:
        sel = self.tag_tree.selection()
        if sel:
            self.tag_key_var.set(self.tag_tree.set(sel[0], "key"))
            self.tag_val_var.set(self.tag_tree.set(sel[0], "value"))

    def _update_tag_value_choices(self) -> None:
        key = self.tag_key_var.get().strip().lower()
        values = next((v for k, v in self.tag_catalog.items() if k.lower() == key), [])
        self.tag_val_combo.configure(values=values)

    def add_tag(self) -> None:
        key, value = self.tag_key_var.get().strip(), self.tag_val_var.get().strip()
        if not key:
            messagebox.showwarning("Tags", "Enter a tag name.")
            return
        problems = [p for p in validate_tags({key: value}) if "Required" not in p]
        if problems:
            messagebox.showerror("Invalid tag", "\n".join(problems))
            return
        for i in self.tag_tree.get_children():
            if self.tag_tree.set(i, "key").lower() == key.lower():
                self.tag_tree.set(i, "key", key)
                self.tag_tree.set(i, "value", value)
                break
        else:
            self.tag_tree.insert("", tk.END, values=(key, value, ""))
        self._sync_required_tags()
        self.tag_key_var.set("")
        self.tag_val_var.set("")
        self.tag_key_combo.focus_set()

    def remove_tag(self) -> None:
        required = {t.lower() for t in self._required_list()}
        for i in self.tag_tree.selection():
            if self.tag_tree.set(i, "key").lower() in required:
                messagebox.showinfo("Tags", f"'{self.tag_tree.set(i, 'key')}' is a required tag; set its value instead.")
                continue
            self.tag_tree.delete(i)

    # ------------------------------------------------------------------ form <-> config

    def config_to_form(self, cfg: AppConfig) -> None:
        self.auth_var.set(AUTH_LABELS.get(cfg.auth.method, AUTH_LABELS["browser"]))
        self.tenant_var.set(cfg.auth.tenant_id)
        if self.session and cfg.subscription:
            try:
                self.sub_var.set(self.session.find_subscription(cfg.subscription).label)
            except LookupError:
                self.sub_var.set(cfg.subscription)
        else:
            self.sub_var.set(cfg.subscription)
        self.rg_var.set(cfg.resource_group)
        self.loc_var.set(cfg.location)
        vm = cfg.vm
        self.vm_name_var.set(vm.name)
        self.size_var.set(vm.size)
        self.image_var.set(vm.image)
        self.os_type_var.set(vm.os_type or "auto")
        self.user_var.set(vm.admin_username)
        self.auth_type_var.set(vm.auth_type)
        self.key_var.set(vm.ssh_public_key_path)
        self.pw_var.set(vm.admin_password)
        self.disk_type_var.set(vm.os_disk_type)
        self.disk_size_var.set(str(vm.os_disk_size_gb or ""))
        self.tl_var.set(vm.trusted_launch)
        net = cfg.network
        self.vnet_var.set(net.vnet_name)
        self.vnet_rg_var.set(net.vnet_resource_group)
        self.vnet_prefix_var.set(net.vnet_address_prefix)
        self.subnet_var.set(net.subnet_name)
        self.subnet_prefix_var.set(net.subnet_address_prefix)
        self.pip_var.set(net.public_ip)
        self.ports_var.set(", ".join(str(p) for p in net.open_ports))
        self.source_var.set(net.allowed_source)
        self.req_var.set(", ".join(cfg.required_tags))
        self._set_tags(cfg.tags)
        self._update_auth_widgets()
        if self.session:
            self.on_subscription_changed()

    def form_to_config(self) -> AppConfig:
        cfg = AppConfig()
        cfg.auth.method = self._auth_method()
        cfg.auth.tenant_id = self.tenant_var.get().strip()
        sub = self.current_subscription()
        cfg.subscription = sub.id if sub else self.sub_var.get().strip()
        cfg.resource_group = self.rg_var.get().strip()
        cfg.location = self.loc_var.get().strip()
        vm = cfg.vm
        vm.name = self.vm_name_var.get().strip()
        vm.size = self.size_var.get().strip()
        vm.image = self.image_var.get().strip()
        vm.os_type = "" if self.os_type_var.get() == "auto" else self.os_type_var.get()
        vm.admin_username = self.user_var.get().strip()
        vm.auth_type = self.auth_type_var.get()
        vm.ssh_public_key_path = self.key_var.get().strip()
        vm.admin_password = self.pw_var.get()
        vm.os_disk_type = self.disk_type_var.get()
        size = self.disk_size_var.get().strip()
        if size and not size.isdigit():
            raise ConfigError("OS disk size must be a whole number of GB.")
        vm.os_disk_size_gb = int(size) if size else None
        vm.trusted_launch = self.tl_var.get()
        net = cfg.network
        chosen = self._vnet_by_label.get(self.vnet_var.get())
        net.vnet_name = chosen["name"] if chosen else self.vnet_var.get().strip()
        net.vnet_resource_group = chosen["resource_group"] if chosen else self.vnet_rg_var.get().strip()
        net.vnet_address_prefix = self.vnet_prefix_var.get().strip()
        net.subnet_name = self.subnet_var.get().strip() or "default"
        net.subnet_address_prefix = self.subnet_prefix_var.get().strip()
        net.public_ip = self.pip_var.get()
        try:
            net.open_ports = [int(p) for p in self.ports_var.get().replace(";", ",").split(",") if p.strip()]
        except ValueError:
            raise ConfigError("Open ports must be numbers separated by commas.") from None
        net.allowed_source = self.source_var.get().strip()
        cfg.tags = self._tags_from_tree()
        cfg.required_tags = self._required_list()
        return cfg

    # ------------------------------------------------------------------ config files

    def open_config(self) -> None:
        path = filedialog.askopenfilename(title="Open config", filetypes=[("YAML", "*.yaml *.yml"), ("All", "*")])
        if not path:
            return
        try:
            cfg = load_config(path)
        except Exception as exc:
            messagebox.showerror("Config error", str(exc))
            return
        self.config_path = Path(path)
        self.config_to_form(cfg)
        self.log(f"Loaded config from {path}")

    def save_config(self, ask: bool = False) -> None:
        try:
            cfg = self.form_to_config()
        except ConfigError as exc:
            messagebox.showerror("Config error", str(exc))
            return
        path = self.config_path
        if ask or path is None:
            chosen = filedialog.asksaveasfilename(title="Save config", defaultextension=".yaml",
                                                  initialfile="config.yaml", filetypes=[("YAML", "*.yaml *.yml")])
            if not chosen:
                return
            path = Path(chosen)
        save_config(cfg, path)
        self.config_path = path
        self.log(f"Saved config to {path} (password not included)")

    # ------------------------------------------------------------------ actions

    def validate(self, quiet: bool = False) -> AppConfig | None:
        try:
            cfg = self.form_to_config()
        except ConfigError as exc:
            messagebox.showerror("Validation", str(exc))
            return None
        errors = validate_config(cfg)
        if self.session and cfg.subscription:
            try:
                self.session.find_subscription(cfg.subscription)
            except LookupError as exc:
                errors.insert(0, str(exc))
        if errors:
            messagebox.showerror("Please fix the following", "\n".join(f"- {e}" for e in errors))
            return None
        if not quiet:
            messagebox.showinfo("Validation", "Everything looks good.")
        return cfg

    def create_vm(self) -> None:
        if not self.session:
            messagebox.showwarning("Not signed in", "Sign in to Azure first.")
            return
        cfg = self.validate(quiet=True)
        if not cfg:
            return
        plan = "\n".join(f"- {line}" for line in plan_resources(cfg))
        if not messagebox.askyesno("Create VM?", f"The following will be created in Azure:\n\n{plan}\n\nContinue?"):
            return
        if cfg.vm.admin_password == "" and os.environ.get(PASSWORD_ENV_VAR):
            self.log(f"Using admin password from {PASSWORD_ENV_VAR}.")
        self.create_btn.configure(state=tk.DISABLED)

        def done(result: dict):
            self.create_btn.configure(state=tk.NORMAL)
            msg = json.dumps(result, indent=2)
            self.log(msg)
            messagebox.showinfo("VM created", f"VM '{result['name']}' was created.\n\n"
                                + (f"Connect with:  {result['connect']}" if result.get("connect") else ""))
            self.on_subscription_changed()  # refresh RGs / vnets / tag suggestions

        def failed(exc):
            self.create_btn.configure(state=tk.NORMAL)
            messagebox.showerror("VM creation failed", str(exc)[:2000])

        self.run_bg(lambda: self.session.create_vm(cfg, progress=self.log), done, failed, "create VM")

    # ------------------------------------------------------------------ browse tab

    def populate_browse_tree(self) -> None:
        tree = self.browse_tree
        tree.delete(*tree.get_children())
        self._browse_nodes.clear()
        if not self.session:
            return
        for sub in self.session.subscriptions:
            iid = tree.insert("", tk.END, text=sub.name, values=("Subscription", "", sub.id))
            self._browse_nodes[iid] = ("sub", sub, None)
            tree.insert(iid, tk.END, text="loading...")

    def on_browse_open(self, _event=None) -> None:
        tree = self.browse_tree
        iid = tree.focus()
        node = self._browse_nodes.get(iid)
        if not node or node[0] == "res":
            return
        children = tree.get_children(iid)
        if not (len(children) == 1 and tree.item(children[0], "text") == "loading..."):
            return  # already loaded
        kind, sub, data = node

        if kind == "sub":
            def done(rgs):
                tree.delete(*tree.get_children(iid))
                for g in rgs:
                    child = tree.insert(iid, tk.END, text=g["name"],
                                        values=("Resource group", g["location"], _fmt_tags(g["tags"])))
                    self._browse_nodes[child] = ("rg", sub, g)
                    tree.insert(child, tk.END, text="loading...")
                if not rgs:
                    tree.insert(iid, tk.END, text="(no resource groups)")

            self.run_bg(lambda: self.session.list_resource_groups(sub), done, what="listing resource groups")
        elif kind == "rg":
            def done(resources):
                tree.delete(*tree.get_children(iid))
                for r in resources:
                    child = tree.insert(iid, tk.END, text=r["name"],
                                        values=(r["type"], r["location"], _fmt_tags(r["tags"])))
                    self._browse_nodes[child] = ("res", sub, r)
                if not resources:
                    tree.insert(iid, tk.END, text="(empty)")

            self.run_bg(lambda: self.session.list_resources(sub, data["name"]), done, what="listing resources")

    def on_browse_select(self) -> None:
        sel = self.browse_tree.selection()
        node = self._browse_nodes.get(sel[0]) if sel else None
        text = ""
        if node:
            kind, sub, data = node
            if kind == "sub":
                text = f"Subscription: {sub.name}\nID: {sub.id}\nTenant: {sub.tenant_id}\nState: {sub.state}\n"
            else:
                text = f"Name: {data['name']}\n"
                if kind == "res":
                    text += f"Type: {data['type']}\n"
                text += f"Location: {data['location']}\nSubscription: {sub.name}\n\nTags:\n"
                text += "\n".join(f"  {k} = {v}" for k, v in data["tags"].items()) or "  (none)"
        self.detail_text.configure(state=tk.NORMAL)
        self.detail_text.delete("1.0", tk.END)
        self.detail_text.insert("1.0", text)
        self.detail_text.configure(state=tk.DISABLED)

    def _browse_selection(self):
        sel = self.browse_tree.selection()
        return self._browse_nodes.get(sel[0]) if sel else None

    def copy_tags_from_browse(self) -> None:
        node = self._browse_selection()
        if not node or node[0] == "sub" or not node[2]["tags"]:
            messagebox.showinfo("Copy tags", "Select a resource group or resource that has tags.")
            return
        tags = self._tags_from_tree()
        lower = {k.lower(): k for k in tags}
        for k, v in node[2]["tags"].items():
            tags[lower.get(k.lower(), k)] = v
        self._set_tags(tags)
        self.notebook.select(0)
        self.log(f"Copied {len(node[2]['tags'])} tag(s) from '{node[2]['name']}'.")

    def use_browse_selection(self) -> None:
        node = self._browse_selection()
        if not node:
            return
        kind, sub, data = node
        self.sub_var.set(sub.label)
        if kind == "rg":
            self.rg_var.set(data["name"])
            self.loc_var.set(data["location"])
        elif kind == "res":
            self.rg_var.set(_rg_from_id(data["id"]))
            self.loc_var.set(data["location"])
        self.notebook.select(0)
        self.on_subscription_changed()


def _fmt_tags(tags: dict[str, str]) -> str:
    return ", ".join(f"{k}={v}" for k, v in tags.items())


def _rg_from_id(resource_id: str) -> str:
    from .azure_ops import resource_group_from_id

    return resource_group_from_id(resource_id)


def run(config_path: str | None = None) -> None:
    App(config_path).mainloop()
