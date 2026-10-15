'use client';

import { useEffect } from 'react';

interface SpringState {
  value: number;
  target: number;
  velocity: number;
}

interface SurfaceRecord {
  filter: SVGFilterElement | null;
  image: SVGElement | null;
  displacements: SVGElement[];
  baseScale: number;
  lastScale: number;
  id: string;
  size: string;
  moving: boolean;
  hovered: boolean;
  pressed: boolean;
  failed: boolean;
  cleanup: () => void;
  spring: {
    lightX: SpringState;
    lightY: SpringState;
    x: SpringState;
    y: SpringState;
    scaleX: SpringState;
    scaleY: SpringState;
    glow: SpringState;
    thickness: SpringState;
  };
}

function createSpring(value: number): SpringState {
  return { value, target: value, velocity: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function GlassEffectProvider() {
  useEffect(() => {
    const ns = 'http://www.w3.org/2000/svg';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const forcedColors = window.matchMedia('(forced-colors: active)');
    const isChromium =
      /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent) &&
      !/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent);
    const canRefract =
      isChromium &&
      typeof ResizeObserver !== 'undefined' &&
      typeof CSS !== 'undefined' &&
      CSS.supports('backdrop-filter', 'url("#liquid-glass-support")');

    const records = new Map<HTMLElement, SurfaceRecord>();
    const mapCache = new Map<string, { href: string; scale: number }>();
    let refreshFrame = 0;
    let motionFrame = 0;
    let previousTime = 0;
    let nextId = 0;

    // SVG container for optical displacement filters
    const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.cssText = 'position:fixed;pointer-events:none;overflow:hidden;top:0;left:0;';
    const defs = document.createElementNS(ns, 'defs') as SVGDefsElement;
    svg.append(defs);
    document.body.append(svg);

    const active = () =>
      document.body.dataset.theme === 'liquid-glass' ||
      document.body.dataset.theme === 'simple' ||
      !document.body.dataset.theme;
    const motionEnabled = () =>
      active() &&
      !document.hidden &&
      (document.body.dataset.liquidMotion === 'full' ||
        (document.body.dataset.liquidMotion !== 'reduced' && !reducedMotion.matches));
    const opticsEnabled = () =>
      active() && canRefract && !reducedTransparency.matches && !forcedColors.matches;

    function element<K extends keyof SVGElementTagNameMap>(
      name: K,
      attributes: Record<string, string>
    ): SVGElementTagNameMap[K] {
      const node = document.createElementNS(ns, name);
      Object.entries(attributes).forEach(([key, val]) => node.setAttribute(key, val));
      return node;
    }

    function radiusInPixels(val: string, extent: number): number {
      return val.endsWith('%') ? (parseFloat(val) / 100) * extent : parseFloat(val);
    }

    function getRadius(surface: HTMLElement, width: number, height: number): number {
      const val = getComputedStyle(surface).borderTopLeftRadius.trim().split(/\s+/);
      const horizontal = radiusInPixels(val[0] || '0', width);
      const vertical = radiusInPixels(val[1] || val[0] || '0', height);
      return Math.max(0, Math.min(horizontal || 0, vertical || 0, width / 2, height / 2));
    }

    function displacementMap(width: number, height: number, radius: number) {
      const key = `${width}:${height}:${radius.toFixed(1)}`;
      if (mapCache.has(key)) return mapCache.get(key)!;

      const resolution = Math.min(1.5, 1200 / width, 300 / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * resolution));
      canvas.height = Math.max(1, Math.round(height * resolution));
      const context = canvas.getContext('2d');
      if (!context) return null;

      const data = context.createImageData(canvas.width, canvas.height);
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      const lensDepth = Math.min(halfHeight, Math.max(18, radius));
      const strength = Math.min(30, Math.max(12, lensDepth * 0.78));

      // Snell's law (air -> glass, n = 1.5) provides authentic curved ray refraction
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const px = ((x + 0.5) / canvas.width) * width - halfWidth;
          const py = ((y + 0.5) / canvas.height) * height - halfHeight;
          const qx = Math.abs(px) - halfWidth + radius;
          const qy = Math.abs(py) - halfHeight + radius;
          const outerX = Math.max(qx, 0);
          const outerY = Math.max(qy, 0);
          const length = Math.hypot(outerX, outerY);
          const depth = radius - length - Math.min(Math.max(qx, qy), 0);
          let bendX = 0;
          let bendY = 0;

          if (depth >= 0) {
            const normalX = length > 0 ? outerX / length : Number(qx > qy);
            const normalY = length > 0 ? outerY / length : Number(qy >= qx);
            const t = clamp(1 - depth / lensDepth, 0, 1);
            const incident = Math.asin(Math.min(0.995, t));
            const refracted = Math.asin(Math.sin(incident) / 1.5);
            const curvature = Math.sin(incident - refracted) / 0.68;
            const interior = 0.11 * (1 - t);
            bendX = -Math.sign(px) * normalX * curvature - (px / halfWidth) * interior;
            bendY = -Math.sign(py) * normalY * curvature - (py / halfHeight) * interior;
          }

          const offset = (y * canvas.width + x) * 4;
          data.data[offset] = Math.round(127.5 + clamp(bendX, -1, 1) * 127.5);
          data.data[offset + 1] = Math.round(127.5 + clamp(bendY, -1, 1) * 127.5);
          data.data[offset + 2] = 128;
          data.data[offset + 3] = 255;
        }
      }

      context.putImageData(data, 0, 0);
      const result = { href: canvas.toDataURL('image/png'), scale: strength * 2 };
      if (mapCache.size >= 32) {
        const firstKey = mapCache.keys().next().value;
        if (firstKey) mapCache.delete(firstKey);
      }
      mapCache.set(key, result);
      return result;
    }

    function buildFilter(record: SurfaceRecord) {
      record.id = 'beatsync-liquid-lens-' + ++nextId;
      record.filter = element('filter', {
        id: record.id,
        filterUnits: 'userSpaceOnUse',
        primitiveUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
      }) as SVGFilterElement;
      record.image = element('feImage', { result: 'lens-map', preserveAspectRatio: 'none' });
      const displacement = element('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'lens-map',
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      });
      record.filter.append(record.image, displacement);
      record.displacements = [displacement];
      defs.append(record.filter);
    }

    function setThickness(record: SurfaceRecord, val: number) {
      if (!record.displacements.length) return;
      const scale = record.baseScale * val;
      if (Math.abs(scale - record.lastScale) < 0.012) return;
      record.lastScale = scale;
      record.displacements.forEach(node => {
        node.setAttribute('scale', scale.toFixed(3));
      });
    }

    function updateSurface(surface: HTMLElement) {
      const record = records.get(surface);
      if (!record) return;

      if (!opticsEnabled() || record.failed) {
        surface.style.removeProperty('--liquid-filter');
        surface.removeAttribute('data-liquid-optics');
        return;
      }

      const width = surface.clientWidth;
      const height = surface.clientHeight;
      if (width < 1 || height < 1) return;
      const radius = getRadius(surface, width, height);
      const size = `${width}:${height}:${radius.toFixed(1)}`;

      if (!record.filter || record.size !== size) {
        const map = displacementMap(width, height, radius);
        if (!map) return;
        if (!record.filter) buildFilter(record);
        if (record.filter && record.image) {
          for (const node of [record.filter, record.image]) {
            node.setAttribute('x', '0');
            node.setAttribute('y', '0');
            node.setAttribute('width', String(width));
            node.setAttribute('height', String(height));
          }
          record.image.setAttribute('href', map.href);
          record.baseScale = map.scale;
          record.lastScale = -Infinity;
          setThickness(record, record.spring.thickness.value);
          record.size = size;
          surface.style.setProperty(
            '--liquid-filter',
            `url("#${record.id}") blur(var(--glass-blur, 0.35px)) saturate(1.24)`
          );
          surface.setAttribute('data-liquid-optics', 'refractive');
        }
      }
    }

    function applyInteraction(surface: HTMLElement, record: SurfaceRecord) {
      const state = record.spring;
      surface.style.setProperty('--pointer-x', (state.lightX.value * 100).toFixed(2) + '%');
      surface.style.setProperty('--pointer-y', (state.lightY.value * 100).toFixed(2) + '%');
      const angle =
        (Math.atan2(state.lightY.value - 0.5, state.lightX.value - 0.5) * 180) / Math.PI + 90;
      surface.style.setProperty('--light-angle', angle.toFixed(2) + 'deg');
      surface.style.setProperty('--surface-x', state.x.value.toFixed(3) + 'px');
      surface.style.setProperty('--surface-y', state.y.value.toFixed(3) + 'px');
      surface.style.setProperty('--surface-scale-x', state.scaleX.value.toFixed(4));
      surface.style.setProperty('--surface-scale-y', state.scaleY.value.toFixed(4));
      surface.style.setProperty('--surface-glow', clamp(state.glow.value, 0, 1).toFixed(3));
      if (opticsEnabled()) setThickness(record, state.thickness.value);
    }

    function tick(time: number) {
      motionFrame = 0;
      if (!motionEnabled()) {
        previousTime = 0;
        return;
      }
      const dt = Math.min(0.032, previousTime ? (time - previousTime) / 1000 : 1 / 60);
      previousTime = time;
      let moving = false;

      records.forEach((record, surface) => {
        if (!record.moving) return;
        let settled = true;

        (Object.values(record.spring) as SpringState[]).forEach(state => {
          // Double sub-step integration keeps the spring rock-solid at 60-144 Hz
          for (let step = 0; step < 2; step += 1) {
            state.velocity += ((state.target - state.value) * 260 - state.velocity * 24) * (dt / 2);
            state.value += state.velocity * (dt / 2);
          }
          if (Math.abs(state.target - state.value) < 0.0007 && Math.abs(state.velocity) < 0.006) {
            state.value = state.target;
            state.velocity = 0;
          } else {
            settled = false;
          }
        });

        applyInteraction(surface, record);
        record.moving = !settled;
        moving = moving || !settled;
      });

      if (moving) {
        motionFrame = requestAnimationFrame(tick);
      } else {
        previousTime = 0;
      }
    }

    function wake(record: SurfaceRecord) {
      record.moving = true;
      if (!motionFrame && motionEnabled()) motionFrame = requestAnimationFrame(tick);
    }

    function resetInteraction(surface: HTMLElement, immediate = false) {
      const record = records.get(surface);
      if (!record) return;
      surface.classList.remove('is-pressing');
      record.hovered = false;
      record.pressed = false;

      const defaults: Record<string, number> = {
        lightX: 0.5,
        lightY: 0.12,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        glow: 0,
        thickness: 1,
      };

      Object.entries(defaults).forEach(([key, val]) => {
        const spring = record.spring[key as keyof typeof record.spring];
        spring.target = val;
        if (immediate) {
          spring.value = val;
          spring.velocity = 0;
        }
      });

      if (immediate) {
        record.moving = false;
        applyInteraction(surface, record);
      } else {
        wake(record);
      }
    }

    function refresh() {
      refreshFrame = 0;
      records.forEach((record, surface) => {
        try {
          updateSurface(surface);
        } catch (error) {
          record.failed = true;
          surface.style.removeProperty('--liquid-filter');
          surface.removeAttribute('data-liquid-optics');
          console.warn('Liquid Glass optical refraction unavailable:', error);
        }
        if (!motionEnabled()) resetInteraction(surface, true);
      });

      refreshAllLenses(false);

      if (!motionEnabled() && motionFrame) {
        cancelAnimationFrame(motionFrame);
        motionFrame = 0;
        previousTime = 0;
      }
    }

    function scheduleRefresh() {
      if (!refreshFrame) refreshFrame = requestAnimationFrame(refresh);
    }

    function updateTargets(record: SurfaceRecord, surface: HTMLElement) {
      const state = record.spring;
      const pressing = record.pressed;
      const isCard = surface.classList.contains('liquid-glass-card') || surface.offsetWidth > 280;

      // Cards never scale or zoom
      if (isCard) {
        state.scaleX.target = 1;
        state.scaleY.target = 1;
        state.glow.target = 0;
        state.thickness.target = 1;
        wake(record);
        return;
      }

      // Small controls: no hover zoom, only subtle press feedback
      state.scaleX.target = pressing ? 0.97 : 1;
      state.scaleY.target = pressing ? 0.97 : 1;
      state.glow.target = 0; // Cursor glow disabled
      state.thickness.target = pressing ? 1.15 : 1;
      wake(record);
    }

    function moveLight(surface: HTMLElement, event: PointerEvent) {
      if (!motionEnabled()) return;
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const record = records.get(surface);
      if (!record) return;

      const isCard = surface.classList.contains('liquid-glass-card') || surface.offsetWidth > 280;

      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      record.spring.lightX.target = x;
      record.spring.lightY.target = y;

      if (isCard) {
        record.spring.x.target = 0;
        record.spring.y.target = 0;
      } else {
        const xFactor = record.pressed ? 3.5 : 2.0;
        const yFactor = record.pressed ? 2.5 : 1.5;
        record.spring.x.target = (x - 0.5) * xFactor;
        record.spring.y.target = (y - 0.5) * yFactor;
      }
      record.hovered = true;
      updateTargets(record, surface);
    }

    function release(surface: HTMLElement) {
      const record = records.get(surface);
      if (!record || !record.pressed) return;
      record.pressed = false;
      surface.classList.remove('is-pressing');
      if (motionEnabled()) {
        updateTargets(record, surface);
      } else {
        resetInteraction(surface, true);
      }
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleRefresh();
            refreshAllLenses(false);
          })
        : null;

    function registerSurface(surface: HTMLElement) {
      if (records.has(surface)) return;

      const onPointerEnter = (e: PointerEvent) => moveLight(surface, e);
      const onPointerMove = (e: PointerEvent) => moveLight(surface, e);
      const onPointerDown = (e: PointerEvent) => {
        if (!motionEnabled() || e.button !== 0) return;
        const rec = records.get(surface);
        if (rec) {
          rec.pressed = true;
          moveLight(surface, e);
          surface.classList.add('is-pressing');
        }
      };
      const onPointerUp = () => release(surface);
      const onPointerCancel = () => resetInteraction(surface);
      const onPointerLeave = () => resetInteraction(surface);
      const onKeyDown = (e: KeyboardEvent) => {
        if (!motionEnabled() || (e.key !== 'Enter' && e.key !== ' ')) return;
        const rec = records.get(surface);
        if (rec) {
          rec.pressed = true;
          updateTargets(rec, surface);
          surface.classList.add('is-pressing');
        }
      };
      const onKeyUp = () => release(surface);
      const onFocusOut = () => resetInteraction(surface);

      surface.addEventListener('pointerenter', onPointerEnter, { passive: true });
      surface.addEventListener('pointermove', onPointerMove, { passive: true });
      surface.addEventListener('pointerdown', onPointerDown, { passive: true });
      surface.addEventListener('pointerup', onPointerUp, { passive: true });
      surface.addEventListener('pointercancel', onPointerCancel, { passive: true });
      surface.addEventListener('pointerleave', onPointerLeave, { passive: true });
      surface.addEventListener('lostpointercapture', onPointerUp, { passive: true });
      surface.addEventListener('keydown', onKeyDown);
      surface.addEventListener('keyup', onKeyUp);
      surface.addEventListener('focusout', onFocusOut);

      resizeObserver?.observe(surface);

      const record: SurfaceRecord = {
        filter: null,
        image: null,
        displacements: [],
        baseScale: 0,
        lastScale: -Infinity,
        id: '',
        size: '',
        moving: false,
        hovered: false,
        pressed: false,
        failed: false,
        spring: {
          lightX: createSpring(0.5),
          lightY: createSpring(0.12),
          x: createSpring(0),
          y: createSpring(0),
          scaleX: createSpring(1),
          scaleY: createSpring(1),
          glow: createSpring(0),
          thickness: createSpring(1),
        },
        cleanup: () => {
          surface.removeEventListener('pointerenter', onPointerEnter);
          surface.removeEventListener('pointermove', onPointerMove);
          surface.removeEventListener('pointerdown', onPointerDown);
          surface.removeEventListener('pointerup', onPointerUp);
          surface.removeEventListener('pointercancel', onPointerCancel);
          surface.removeEventListener('pointerleave', onPointerLeave);
          surface.removeEventListener('lostpointercapture', onPointerUp);
          surface.removeEventListener('keydown', onKeyDown);
          surface.removeEventListener('keyup', onKeyUp);
          surface.removeEventListener('focusout', onFocusOut);
          resizeObserver?.unobserve(surface);
          if (record.filter) {
            record.filter.remove();
          }
        },
      };

      records.set(surface, record);
      updateSurface(surface);
    }

    function unregisterSurface(surface: HTMLElement) {
      const record = records.get(surface);
      if (record) {
        record.cleanup();
        records.delete(surface);
      }
    }

    // =========================================================================
    // Liquid Glass Selection Lens Engine (Spring Physics & Drag Interaction)
    // Directly based on projects-portal liquid-glass-ui.js
    // =========================================================================
    const lensDimensions = ['x', 'y', 'width', 'height'] as const;
    const lensDeformations = ['scaleX', 'scaleY', 'rotate', 'bloom'] as const;
    const lensVariables: Record<string, string> = {
      x: '--lens-x',
      y: '--lens-y',
      width: '--lens-width',
      height: '--lens-height',
      scaleX: '--lens-scale-x',
      scaleY: '--lens-scale-y',
      rotate: '--lens-rotate',
      bloom: '--lens-bloom',
    };

    interface LensGroupRecord {
      group: HTMLElement;
      lens: HTMLElement;
      buttons: HTMLElement[];
      value: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotate: number; bloom: number };
      target: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotate: number; bloom: number };
      velocity: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotate: number; bloom: number };
      initialized: boolean;
      drag: { id: number; startX: number; startY: number; moved: boolean; grabOffset: number } | null;
      pressed: boolean;
      bloomUntil: number;
      suppressClickUntil: number;
      dispatchingSelection: boolean;
      filter: SVGFilterElement | null;
      image: SVGElement | null;
      displacements: SVGElement[];
      filterId: string;
      filterSize: string;
      cleanup: () => void;
    }

    const lensGroups = new Map<HTMLElement, LensGroupRecord>();
    let lensSpringFrame = 0;
    let lensPreviousTime = 0;

    function selectedButton(record: LensGroupRecord): HTMLElement | null {
      return (
        record.group.querySelector<HTMLElement>('.tab-btn[aria-pressed="true"], button[aria-pressed="true"]') ||
        record.group.querySelector<HTMLElement>('.tab-btn.active, button.active') ||
        record.buttons[0] ||
        null
      );
    }

    function buttonGeometry(button: HTMLElement, group?: HTMLElement) {
      if (group) {
        const groupRect = group.getBoundingClientRect();
        const btnRect = button.getBoundingClientRect();
        if (groupRect.width > 0 && btnRect.width > 0) {
          return {
            x: btnRect.left - groupRect.left,
            y: btnRect.top - groupRect.top,
            width: btnRect.width,
            height: btnRect.height,
          };
        }
      }
      return {
        x: button.offsetLeft,
        y: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
      };
    }

    function lensBorderDisplacementMap(width: number, height: number, radius: number) {
      const key = `lens-border-v2:${width}:${height}:${radius.toFixed(1)}`;
      if (mapCache.has(key)) return mapCache.get(key)!;

      const resolution = Math.min(1.5, 600 / width, 200 / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * resolution));
      canvas.height = Math.max(1, Math.round(height * resolution));
      const context = canvas.getContext('2d');
      if (!context) return null;

      const data = context.createImageData(canvas.width, canvas.height);
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      // Border-only bevel zone: expanded from 6.0px to 9.5px for deeper perimeter refraction
      const bevelWidth = Math.min(halfHeight * 0.55, 9.5);
      const strength = 13.0; // Refined optical refraction across the wider curvature rim

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const px = ((x + 0.5) / canvas.width) * width - halfWidth;
          const py = ((y + 0.5) / canvas.height) * height - halfHeight;
          const qx = Math.abs(px) - halfWidth + radius;
          const qy = Math.abs(py) - halfHeight + radius;
          const outerX = Math.max(qx, 0);
          const outerY = Math.max(qy, 0);
          const length = Math.hypot(outerX, outerY);
          const depth = radius - length - Math.min(Math.max(qx, qy), 0);
          let bendX = 0;
          let bendY = 0;

          // Strictly confined to the outer bevel border (depth < bevelWidth)
          if (depth >= 0 && depth < bevelWidth) {
            const normalX = length > 0 ? outerX / length : Number(qx > qy);
            const normalY = length > 0 ? outerY / length : Number(qy >= qx);
            // Smooth falloff from edge (t=1) to interior (t=0)
            const t = (bevelWidth - depth) / bevelWidth;
            const factor = Math.sin(t * (Math.PI / 2)) * 0.85;
            bendX = -Math.sign(px) * normalX * factor;
            bendY = -Math.sign(py) * normalY * factor;
          }

          const offset = (y * canvas.width + x) * 4;
          data.data[offset] = Math.round(127.5 + clamp(bendX, -1, 1) * 127.5);
          data.data[offset + 1] = Math.round(127.5 + clamp(bendY, -1, 1) * 127.5);
          data.data[offset + 2] = 128;
          data.data[offset + 3] = 255;
        }
      }

      context.putImageData(data, 0, 0);
      const result = { href: canvas.toDataURL('image/png'), scale: strength };
      if (mapCache.size >= 48) {
        const firstKey = mapCache.keys().next().value;
        if (firstKey) mapCache.delete(firstKey);
      }
      mapCache.set(key, result);
      return result;
    }

    function updateLensOptics(record: LensGroupRecord) {
      if (!opticsEnabled()) {
        record.lens.style.removeProperty('--lens-filter');
        return;
      }
      const width = Math.max(1, Math.round(record.target.width || record.value.width));
      const height = Math.max(1, Math.round(record.target.height || record.value.height));
      if (width < 8 || height < 8) return;
      const radius = height / 2;
      const sizeKey = `${width}:${height}:${radius.toFixed(1)}`;

      if (!record.filter || record.filterSize !== sizeKey) {
        const map = lensBorderDisplacementMap(width, height, radius);
        if (!map) return;
        if (!record.filter) {
          record.filterId = 'beatsync-lens-optics-' + ++nextId;
          record.filter = element('filter', {
            id: record.filterId,
            filterUnits: 'userSpaceOnUse',
            primitiveUnits: 'userSpaceOnUse',
            'color-interpolation-filters': 'sRGB',
          }) as SVGFilterElement;
          record.image = element('feImage', { result: 'lens-map', preserveAspectRatio: 'none' });
          const displacement = element('feDisplacementMap', {
            in: 'SourceGraphic',
            in2: 'lens-map',
            xChannelSelector: 'R',
            yChannelSelector: 'G',
          });
          record.filter.append(record.image, displacement);
          record.displacements = [displacement];
          defs.append(record.filter);
        }

        if (record.filter && record.image) {
          for (const node of [record.filter, record.image]) {
            node.setAttribute('x', '0');
            node.setAttribute('y', '0');
            node.setAttribute('width', String(width));
            node.setAttribute('height', String(height));
          }
          record.image.setAttribute('href', map.href);
        }
        record.filterSize = sizeKey;

        // Subtle displacement scale
        const scale = map.scale;
        record.displacements.forEach((node) => {
          node.setAttribute('scale', scale.toFixed(3));
        });

        record.lens.style.setProperty(
          '--lens-filter',
          `url("#${record.filterId}")`
        );
      }
    }

    function renderLens(record: LensGroupRecord) {
      for (const key of lensDimensions) {
        record.group.style.setProperty(lensVariables[key], `${record.value[key].toFixed(3)}px`);
      }
      const scale = record.value.scaleX.toFixed(5);
      record.group.style.setProperty('--lens-scale-x', scale);
      record.group.style.setProperty('--lens-scale-y', scale);
      record.group.style.setProperty('--lens-scale', scale);
      record.group.style.setProperty('--lens-rotate', '0deg');
      record.group.style.setProperty('--lens-bloom', `${record.value.bloom.toFixed(5)}`);
      record.lens.style.opacity = record.value.width > 8 ? '1' : '0';
      updateLensOptics(record);
    }

    function snapLens(record: LensGroupRecord) {
      Object.assign(record.target, { scaleX: 1, scaleY: 1, rotate: 0, bloom: 0 });
      Object.assign(record.value, record.target);
      for (const key of Object.keys(record.velocity) as Array<keyof typeof record.velocity>) {
        record.velocity[key] = 0;
      }
      renderLens(record);
    }

    function wakeLens() {
      if (!active() || !motionEnabled() || lensSpringFrame) return;
      lensPreviousTime = 0;
      lensSpringFrame = requestAnimationFrame(advanceLens);
    }

    function aimLens(
      record: LensGroupRecord,
      geom: { x: number; y: number; width: number; height: number },
      immediate = false
    ) {
      if (!active() || !geom.width || !geom.height) return;
      Object.assign(record.target, geom);
      if (immediate || !record.initialized || !motionEnabled()) {
        snapLens(record);
      } else {
        wakeLens();
      }
      record.initialized = true;
    }

    function integrateLens(
      record: LensGroupRecord,
      key: keyof LensGroupRecord['value'],
      dt: number,
      stiffness: number,
      damping: number
    ) {
      const acceleration = stiffness * (record.target[key] - record.value[key]) - damping * record.velocity[key];
      record.velocity[key] += acceleration * dt;
      record.value[key] += record.velocity[key] * dt;
    }

    function advanceLens(now: number) {
      lensSpringFrame = 0;
      if (!active() || !motionEnabled()) return;

      const elapsed = lensPreviousTime ? clamp((now - lensPreviousTime) / 1000, 0.001, 0.064) : 1 / 60;
      lensPreviousTime = now;
      const steps = Math.ceil(elapsed / (1 / 120));
      const dt = elapsed / steps;
      let unsettled = false;

      lensGroups.forEach(record => {
        if (!record.initialized || !record.group.clientWidth) return;
        const dragging = record.drag?.moved;
        const isBlooming = record.pressed || now < record.bloomUntil;
        // Expand/scale up upon click or press (+36% bloom so it protrudes beyond the outer glass)
        const bloomScale = isBlooming ? 0.36 : 0;
        record.target.bloom = isBlooming ? 1 : 0;

        for (let step = 0; step < steps; step += 1) {
          for (const key of lensDimensions) {
            integrateLens(record, key, dt, dragging ? 580 : 380, dragging ? 46 : 39);
          }
          const uniformScale = 1 + bloomScale;
          record.target.scaleX = uniformScale;
          record.target.scaleY = uniformScale;
          record.target.rotate = 0;
          for (const key of lensDeformations) {
            const stiffness = key === 'bloom' ? 980 : 920;
            const damping = key === 'bloom' ? 46 : 44;
            integrateLens(record, key, dt, stiffness, damping);
          }
        }

        let moving = false;
        for (const key of [...lensDimensions, ...lensDeformations]) {
          const tolerance = (lensDimensions as readonly string[]).includes(key) ? 0.025 : 0.0002;
          if (
            Math.abs(record.value[key] - record.target[key]) > tolerance ||
            Math.abs(record.velocity[key]) > tolerance * 4
          ) {
            moving = true;
          } else {
            record.value[key] = record.target[key];
            record.velocity[key] = 0;
          }
        }
        renderLens(record);
        unsettled = unsettled || moving || isBlooming || Math.abs(record.value.bloom) > 0.003;
      });

      if (unsettled) {
        lensSpringFrame = requestAnimationFrame(advanceLens);
      } else {
        lensPreviousTime = 0;
      }
    }

    function localPointerX(record: LensGroupRecord, clientX: number) {
      const rect = record.group.getBoundingClientRect();
      return ((clientX - rect.left) * record.group.offsetWidth) / (rect.width || 1);
    }

    function nearestButton(record: LensGroupRecord, clientX: number): HTMLElement | null {
      const x = localPointerX(record, clientX);
      const candidates = record.buttons.filter(b => !(b as HTMLButtonElement).disabled && b.offsetWidth);
      if (!candidates.length) return null;
      return candidates.reduce<{ button: HTMLElement; delta: number } | null>((closest, b) => {
        const delta = Math.abs(x - b.offsetLeft - b.offsetWidth / 2);
        return !closest || delta < closest.delta ? { button: b, delta } : closest;
      }, null)?.button || null;
    }

    function followPointer(record: LensGroupRecord, clientX: number) {
      const button = nearestButton(record, clientX);
      if (!button || !record.drag) return;
      const geom = buttonGeometry(button, record.group);
      if (motionEnabled()) {
        const inset = parseFloat(getComputedStyle(record.group).paddingLeft) || 0;
        const center = localPointerX(record, clientX) - record.drag.grabOffset;
        geom.x = clamp(center - geom.width / 2, inset, record.group.clientWidth - inset - geom.width);
      }
      aimLens(record, geom);
    }

    function clearDrag(record: LensGroupRecord) {
      const drag = record.drag;
      record.drag = null;
      record.pressed = false;
      record.group.classList.remove('is-dragging');
      if (drag && record.group.hasPointerCapture(drag.id)) {
        try {
          record.group.releasePointerCapture(drag.id);
        } catch {}
      }
      return drag;
    }

    function finishDrag(record: LensGroupRecord, event: PointerEvent | null, cancelled: boolean) {
      if (!record.drag || (event && record.drag.id !== event.pointerId)) return;
      const drag = clearDrag(record);
      record.bloomUntil = cancelled ? 0 : performance.now() + 80;
      wakeLens();
      if (drag && drag.moved) record.suppressClickUntil = performance.now() + 700;
      if (drag && drag.moved && !cancelled && active() && event) {
        const button = nearestButton(record, event.clientX);
        if (button) {
          record.dispatchingSelection = true;
          try {
            button.click();
          } finally {
            record.dispatchingSelection = false;
          }
          button.focus({ preventScroll: true });
          aimLens(record, buttonGeometry(button, record.group));
          return;
        }
      }
      if (cancelled) {
        const selected = selectedButton(record);
        if (selected) aimLens(record, buttonGeometry(selected, record.group));
      }
    }

    function registerLensGroup(group: HTMLElement) {
      if (lensGroups.has(group)) return;

      // Ensure .selection-lens exists inside group
      let lens = group.querySelector<HTMLElement>('.selection-lens');
      if (!lens) {
        lens = document.createElement('span');
        lens.className = 'selection-lens';
        lens.setAttribute('aria-hidden', 'true');
        group.prepend(lens);
      }

      const buttons = Array.from(group.querySelectorAll<HTMLElement>('.tab-btn, button'));

      const record: LensGroupRecord = {
        group,
        lens,
        buttons,
        value: { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, rotate: 0, bloom: 0 },
        target: { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, rotate: 0, bloom: 0 },
        velocity: { x: 0, y: 0, width: 0, height: 0, scaleX: 0, scaleY: 0, rotate: 0, bloom: 0 },
        initialized: false,
        drag: null,
        pressed: false,
        bloomUntil: 0,
        suppressClickUntil: 0,
        dispatchingSelection: false,
        filter: null,
        image: null,
        displacements: [],
        filterId: '',
        filterSize: '',
        cleanup: () => {},
      };

      const onPointerDown = (event: PointerEvent) => {
        if (!active() || event.button !== 0 || event.isPrimary === false) return;
        const button = (event.target as HTMLElement).closest?.('.tab-btn, button') as HTMLElement;
        if (!button || !record.buttons.includes(button) || (button as HTMLButtonElement).disabled) return;
        finishDrag(record, null, true);
        record.suppressClickUntil = 0;
        record.pressed = true;
        const geom = buttonGeometry(button, record.group);
        record.drag = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          grabOffset: localPointerX(record, event.clientX) - geom.x - geom.width / 2,
        };
        aimLens(record, geom);
        wakeLens();
      };

      const onPointerMove = (event: PointerEvent) => {
        const drag = record.drag;
        if (!drag || drag.id !== event.pointerId) return;
        const dx = Math.abs(event.clientX - drag.startX);
        const dy = Math.abs(event.clientY - drag.startY);
        if (!drag.moved && dy > dx && dy > 8) {
          finishDrag(record, event, true);
          return;
        }
        if (!drag.moved && dx > 7) {
          drag.moved = true;
          group.classList.add('is-dragging');
          try {
            group.setPointerCapture(event.pointerId);
          } catch {}
        }
        if (drag.moved) followPointer(record, event.clientX);
      };

      const onPointerUp = (event: PointerEvent) => finishDrag(record, event, false);
      const onPointerCancel = (event: PointerEvent) => finishDrag(record, event, true);
      const onLostCapture = (event: PointerEvent) => finishDrag(record, event, true);
      const onPointerLeave = (event: PointerEvent) => {
        if (record.drag && !record.drag.moved) finishDrag(record, event, true);
      };

      const onClick = (event: MouseEvent) => {
        if (
          !record.dispatchingSelection &&
          event.detail !== 0 &&
          performance.now() < record.suppressClickUntil
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        record.bloomUntil = performance.now() + 80;
        wakeLens();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (!active() || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const targetBtn = (event.target as HTMLElement).closest?.('.tab-btn, button') as HTMLElement;
        const index = record.buttons.indexOf(targetBtn);
        if (index === -1) return;
        event.preventDefault();
        finishDrag(record, null, true);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
            ? record.buttons.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + record.buttons.length) % record.buttons.length;
        const nextBtn = record.buttons[next];
        if (nextBtn) {
          record.bloomUntil = performance.now() + 80;
          wakeLens();
          nextBtn.click();
          nextBtn.focus({ preventScroll: true });
        }
      };

      group.addEventListener('pointerdown', onPointerDown);
      group.addEventListener('pointermove', onPointerMove);
      group.addEventListener('pointerup', onPointerUp);
      group.addEventListener('pointercancel', onPointerCancel);
      group.addEventListener('lostpointercapture', onLostCapture);
      group.addEventListener('pointerleave', onPointerLeave);
      group.addEventListener('click', onClick, true);
      group.addEventListener('keydown', onKeyDown);

      const groupObserver = new MutationObserver(() => {
        record.buttons = Array.from(group.querySelectorAll<HTMLElement>('.tab-btn, button'));
        const sel = selectedButton(record);
        if (sel) {
          aimLens(record, buttonGeometry(sel, record.group));
        }
      });
      groupObserver.observe(group, {
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-pressed'],
      });

      resizeObserver?.observe(group);

      record.cleanup = () => {
        group.removeEventListener('pointerdown', onPointerDown);
        group.removeEventListener('pointermove', onPointerMove);
        group.removeEventListener('pointerup', onPointerUp);
        group.removeEventListener('pointercancel', onPointerCancel);
        group.removeEventListener('lostpointercapture', onLostCapture);
        group.removeEventListener('pointerleave', onPointerLeave);
        group.removeEventListener('click', onClick, true);
        group.removeEventListener('keydown', onKeyDown);
        groupObserver.disconnect();
        resizeObserver?.unobserve(group);
        if (record.filter) {
          record.filter.remove();
        }
      };

      lensGroups.set(group, record);

      // Initial alignment
      const selected = selectedButton(record);
      if (selected) {
        aimLens(record, buttonGeometry(selected, record.group), true);
      }
    }

    function unregisterLensGroup(group: HTMLElement) {
      const record = lensGroups.get(group);
      if (record) {
        record.cleanup();
        lensGroups.delete(group);
      }
    }

    function refreshAllLenses(immediate = false) {
      lensGroups.forEach(record => {
        if (!record.drag) {
          const btn = selectedButton(record);
          if (btn) {
            const shouldSnap = immediate && (!record.initialized || !motionEnabled());
            aimLens(record, buttonGeometry(btn, record.group), shouldSnap);
          }
        }
      });
    }

    function scheduleLensRealignment() {
      requestAnimationFrame(() => {
        refreshAllLenses(false);
      });
      setTimeout(() => refreshAllLenses(false), 80);
    }

    // Dynamic Discovery: Query and observe all current and future [data-liquid-surface] and [data-liquid-segment-group] elements
    function syncSurfaces() {
      const foundSurfaces = document.querySelectorAll<HTMLElement>('[data-liquid-surface]');
      const activeSurfaceSet = new Set(foundSurfaces);

      foundSurfaces.forEach(el => registerSurface(el));
      records.forEach((_, el) => {
        if (!activeSurfaceSet.has(el)) unregisterSurface(el);
      });

      // Discover and register liquid segment groups
      const foundGroups = document.querySelectorAll<HTMLElement>(
        '[data-liquid-segment-group], .liquid-segment-group, .category-control, .sort-control, .apple-glass-segment-group'
      );
      const activeGroupSet = new Set(foundGroups);

      foundGroups.forEach(el => registerLensGroup(el));
      lensGroups.forEach((_, el) => {
        if (!activeGroupSet.has(el)) unregisterLensGroup(el);
      });
      if (foundGroups.length > 0) scheduleLensRealignment();
    }

    syncSurfaces();

    const domMutationObserver = new MutationObserver(mutations => {
      let structuralChange = false;
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (
              node instanceof HTMLElement &&
              (node.hasAttribute('data-liquid-surface') ||
                node.hasAttribute('data-liquid-segment-group') ||
                node.querySelector?.('[data-liquid-surface], [data-liquid-segment-group]'))
            ) {
              structuralChange = true;
              break;
            }
          }
          if (structuralChange) break;
          for (const node of m.removedNodes) {
            if (
              node instanceof HTMLElement &&
              (node.hasAttribute('data-liquid-surface') ||
                node.hasAttribute('data-liquid-segment-group') ||
                node.querySelector?.('[data-liquid-surface], [data-liquid-segment-group]'))
            ) {
              structuralChange = true;
              break;
            }
          }
        } else if (m.type === 'attributes') {
          structuralChange = true;
        }
        if (structuralChange) break;
      }

      if (structuralChange) {
        syncSurfaces();
        scheduleRefresh();
      }
    });
    domMutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-liquid-surface', 'data-liquid-segment-group', 'data-theme', 'data-mode', 'data-liquid-motion'],
    });

    const onWindowBlur = () => {
      records.forEach((_, surface) => resetInteraction(surface, true));
      lensGroups.forEach(record => finishDrag(record, null, true));
    };
    const onGlobalPointerUp = () => {
      records.forEach((_, surface) => release(surface));
      lensGroups.forEach(record => finishDrag(record, null, true));
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('pointerup', onGlobalPointerUp, { passive: true });
    window.addEventListener('resize', () => {
      scheduleRefresh();
      refreshAllLenses(false);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      scheduleRefresh();
      if (!document.hidden) refreshAllLenses(false);
    });

    const onMediaChange = () => {
      scheduleRefresh();
      refreshAllLenses(true);
    };
    reducedMotion.addEventListener('change', onMediaChange);
    reducedTransparency.addEventListener('change', onMediaChange);
    forcedColors.addEventListener('change', onMediaChange);

    scheduleRefresh();
    refreshAllLenses(true);

    // Global Audio Context unlocker on first user gesture
    const unlockAudio = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
        }
      } catch {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    return () => {
      domMutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('resize', scheduleRefresh);
      document.removeEventListener('visibilitychange', scheduleRefresh);
      reducedMotion.removeEventListener('change', onMediaChange);
      reducedTransparency.removeEventListener('change', onMediaChange);
      forcedColors.removeEventListener('change', onMediaChange);

      records.forEach(rec => rec.cleanup());
      records.clear();
      lensGroups.forEach(rec => rec.cleanup());
      lensGroups.clear();
      svg.remove();

      if (refreshFrame) cancelAnimationFrame(refreshFrame);
      if (motionFrame) cancelAnimationFrame(motionFrame);
      if (lensSpringFrame) cancelAnimationFrame(lensSpringFrame);

      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return null;
}
