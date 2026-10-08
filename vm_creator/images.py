"""Well-known marketplace images, addressable by a short alias.

Any other marketplace image can be used by giving its URN
``publisher:offer:sku:version`` (as shown by ``az vm image list``).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ImageRef:
    publisher: str
    offer: str
    sku: str
    version: str
    os_type: str  # "linux" or "windows"

    @property
    def urn(self) -> str:
        return f"{self.publisher}:{self.offer}:{self.sku}:{self.version}"


COMMON_IMAGES: dict[str, ImageRef] = {
    "ubuntu-24.04": ImageRef("Canonical", "ubuntu-24_04-lts", "server", "latest", "linux"),
    "ubuntu-22.04": ImageRef("Canonical", "0001-com-ubuntu-server-jammy", "22_04-lts-gen2", "latest", "linux"),
    "debian-12": ImageRef("Debian", "debian-12", "12-gen2", "latest", "linux"),
    "rhel-9": ImageRef("RedHat", "RHEL", "9-lvm-gen2", "latest", "linux"),
    "windows-server-2025": ImageRef(
        "MicrosoftWindowsServer", "WindowsServer", "2025-datacenter-azure-edition", "latest", "windows"
    ),
    "windows-server-2022": ImageRef(
        "MicrosoftWindowsServer", "WindowsServer", "2022-datacenter-azure-edition", "latest", "windows"
    ),
    "windows-server-2019": ImageRef(
        "MicrosoftWindowsServer", "WindowsServer", "2019-datacenter-gensecond", "latest", "windows"
    ),
}


def resolve_image(image: str, os_type: str = "") -> ImageRef:
    """Turn an alias or a ``publisher:offer:sku:version`` URN into an ImageRef."""
    image = (image or "").strip()
    if image in COMMON_IMAGES:
        return COMMON_IMAGES[image]
    parts = image.split(":")
    if len(parts) != 4 or not all(parts):
        raise ValueError(
            f"Unknown image '{image}'. Use one of {', '.join(COMMON_IMAGES)} "
            "or a URN like Canonical:ubuntu-24_04-lts:server:latest."
        )
    publisher, offer, sku, version = parts
    guessed = "windows" if "windows" in (publisher + offer).lower() else "linux"
    os_type = (os_type or guessed).lower()
    if os_type not in ("linux", "windows"):
        raise ValueError("vm.os_type must be 'linux' or 'windows'.")
    return ImageRef(publisher, offer, sku, version, os_type)
