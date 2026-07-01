// Page 1: marker list + create/edit/delete — the watch's WatchMarkerListView.
// New markers drop ahead of the player; each row shows icon, name and live
// distance, with edit and swipe-style delete.

import { el, clear, type Page } from "../dom.ts";
import { markerStore, MARKER_ICONS, MARKER_COLORS } from "../../state/markers.ts";
import { locationManager } from "../../state/location.ts";
import { distanceMeters, formatDistance } from "../../geo/geo.ts";
import type { Marker } from "../../types.ts";

export function createMarkersPage(): Page {
  const list = el("div", { class: "marker-list" });
  const editorHost = el("div", { class: "editor-host" });

  const addBtn = el("button", { class: "primary-btn", onclick: () => openEditor(null) }, [
    "＋ New marker",
  ]);
  const header = el("div", { class: "page-header" }, [
    el("h2", {}, ["Markers"]),
    addBtn,
  ]);
  const root = el("div", { class: "page scroll-page" }, [header, editorHost, list]);

  let editing: Marker | null = null;
  let draftIcon = MARKER_ICONS[0];
  let draftColor = MARKER_COLORS[0];

  function openEditor(marker: Marker | null): void {
    editing = marker;
    draftIcon = marker?.icon ?? MARKER_ICONS[0];
    draftColor = marker?.color ?? MARKER_COLORS[0];
    renderEditor();
  }

  function closeEditor(): void {
    editing = undefined as never;
    clear(editorHost);
    editorHost.classList.remove("open");
  }

  function renderEditor(): void {
    clear(editorHost);
    editorHost.classList.add("open");
    const nameInput = el("input", {
      class: "text-input",
      type: "text",
      placeholder: "Marker name",
      value: editing?.name ?? "",
      maxlength: 24,
    }) as HTMLInputElement;

    const iconRow = el("div", { class: "chip-row" },
      MARKER_ICONS.map((icon) =>
        el("button", {
          class: `chip ${icon === draftIcon ? "sel" : ""}`,
          onclick: () => { draftIcon = icon; renderEditor(); nameInput.focus(); },
        }, [icon]),
      ),
    );

    const colorRow = el("div", { class: "chip-row" },
      MARKER_COLORS.map((color) =>
        el("button", {
          class: `swatch ${color === draftColor ? "sel" : ""}`,
          style: `background:${color}`,
          onclick: () => { draftColor = color; renderEditor(); },
        }),
      ),
    );

    const saveBtn = el("button", { class: "primary-btn", onclick: () => {
      const name = nameInput.value.trim() || "Marker";
      if (editing) markerStore.update(editing.id, { name, icon: draftIcon, color: draftColor });
      else markerStore.add(name, draftIcon, draftColor);
      closeEditor();
    } }, [editing ? "Save" : "Drop here"]);

    const cancelBtn = el("button", { class: "ghost-btn", onclick: closeEditor }, ["Cancel"]);

    if (!editing && !locationManager.location) {
      editorHost.append(el("p", { class: "hint" }, ["Waiting for your location…"]));
    }

    editorHost.append(
      el("div", { class: "editor" }, [
        nameInput,
        el("div", { class: "editor-label" }, ["Icon"]),
        iconRow,
        el("div", { class: "editor-label" }, ["Colour"]),
        colorRow,
        el("div", { class: "editor-actions" }, [cancelBtn, saveBtn]),
      ]),
    );
    // Give the name field focus for quick entry.
    requestAnimationFrame(() => nameInput.focus());
  }

  function renderList(): void {
    clear(list);
    if (markerStore.markers.length === 0) {
      list.append(el("p", { class: "empty" }, ["No markers yet. Drop one ahead of you."]));
      return;
    }
    const loc = locationManager.location;
    const rows = [...markerStore.markers];
    if (loc) {
      rows.sort(
        (a, b) =>
          distanceMeters(loc, { lat: a.lat, lon: a.lon }) -
          distanceMeters(loc, { lat: b.lat, lon: b.lon }),
      );
    }
    for (const m of rows) {
      const dist = loc ? formatDistance(distanceMeters(loc, { lat: m.lat, lon: m.lon })) : "—";
      const row = el("div", { class: "marker-row" }, [
        el("span", { class: "marker-icon", style: `color:${m.color}` }, [m.icon]),
        el("div", { class: "marker-meta" }, [
          el("span", { class: "marker-name" }, [m.name]),
          el("span", { class: "marker-dist" }, [dist]),
        ]),
        el("button", { class: "row-btn", onclick: () => openEditor(m) }, ["✎"]),
        el("button", { class: "row-btn danger", onclick: () => {
          markerStore.remove(m.id);
        } }, ["🗑"]),
      ]);
      list.append(row);
    }
  }

  return {
    el: root,
    onShow: renderList,
    update: renderList,
  };
}
