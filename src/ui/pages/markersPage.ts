// Page 1: marker list + create/edit/delete — the watch's WatchMarkerListView.
// The icon picker uses the current theme's real icon set (Vice/Wasteland/
// Phantasy) plus a "Letter" marker; new markers drop ahead of the player.

import { el, clear, type Page } from "../dom.ts";
import { markerStore, iconPathsFor, MARKER_COLORS, LETTER_ICON } from "../../state/markers.ts";
import { locationManager } from "../../state/location.ts";
import { themeManager } from "../../state/themeManager.ts";
import { distanceMeters, formatDistance } from "../../geo/geo.ts";
import type { Marker } from "../../types.ts";

export function createMarkersPage(): Page {
  const list = el("div", { class: "marker-list" });
  const editorHost = el("div", { class: "editor-host" });
  const addBtn = el("button", { class: "primary-btn", onclick: () => openEditor(null) }, ["＋ New marker"]);
  const header = el("div", { class: "page-header" }, [el("h2", {}, ["Markers"]), addBtn]);
  const root = el("div", { class: "page scroll-page" }, [header, editorHost, list]);

  let editing: Marker | null = null;
  let open = false;
  let draftIcon = LETTER_ICON;
  let draftColor = MARKER_COLORS[0];

  function openEditor(marker: Marker | null): void {
    editing = marker;
    open = true;
    draftIcon = marker?.icon ?? LETTER_ICON;
    draftColor = marker?.color ?? MARKER_COLORS[0];
    renderEditor();
  }

  function closeEditor(): void {
    open = false;
    editing = null;
    clear(editorHost);
    editorHost.classList.remove("open");
  }

  function iconButton(icon: string, sel: boolean, onClick: () => void): HTMLElement {
    if (icon === LETTER_ICON) {
      return el("button", { class: `chip ${sel ? "sel" : ""}`, onclick: onClick, title: "Letter" }, ["A"]);
    }
    const b = el("button", { class: `chip ${sel ? "sel" : ""}`, onclick: onClick });
    b.append(el("img", { src: icon, class: "chip-img", loading: "lazy" }));
    return b;
  }

  function renderEditor(): void {
    if (!open) return;
    clear(editorHost);
    editorHost.classList.add("open");

    const nameInput = el("input", {
      class: "text-input", type: "text", placeholder: "Marker name",
      value: editing?.name ?? "", maxlength: 24,
    }) as HTMLInputElement;

    const icons = [LETTER_ICON, ...iconPathsFor(themeManager.palette.iconSet)];
    const iconRow = el("div", { class: "chip-row scroll-x" },
      icons.map((icon) => iconButton(icon, icon === draftIcon, () => {
        draftIcon = icon; renderEditor();
      })),
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
    editorHost.append(el("div", { class: "editor" }, [
      nameInput,
      el("div", { class: "editor-label" }, ["Icon"]),
      iconRow,
      el("div", { class: "editor-label" }, ["Colour"]),
      colorRow,
      el("div", { class: "editor-actions" }, [cancelBtn, saveBtn]),
    ]));
    requestAnimationFrame(() => nameInput.focus());
  }

  function markerGlyph(m: Marker): HTMLElement {
    if (m.icon && m.icon !== LETTER_ICON) {
      return el("span", { class: "marker-icon" }, [
        el("img", { src: m.icon, class: "marker-icon-img" }),
      ]);
    }
    return el("span", {
      class: "marker-icon letter",
      style: `background:${m.color}`,
    }, [(m.name.trim()[0] || "?").toUpperCase()]);
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
      list.append(el("div", { class: "marker-row" }, [
        markerGlyph(m),
        el("div", { class: "marker-meta" }, [
          el("span", { class: "marker-name" }, [m.name]),
          el("span", { class: "marker-dist" }, [dist]),
        ]),
        el("button", { class: "row-btn", onclick: () => openEditor(m) }, ["✎"]),
        el("button", { class: "row-btn danger", onclick: () => markerStore.remove(m.id) }, ["🗑"]),
      ]));
    }
  }

  const update = () => { renderList(); if (open) renderEditor(); };
  return { el: root, onShow: renderList, update };
}
