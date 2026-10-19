"use client";

import type { HomeContent } from "@/db/schema";
import { useCallback, useEffect, useRef, useState } from "react";

type Tile = HomeContent["mosaic"][number];

function getMetrics() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw <= 760;
  const isTablet = vw <= 1100 && !isMobile;
  const edge = isMobile ? 16 : isTablet ? 20 : 32;
  const gap = isMobile ? 15 : isTablet ? 18 : 32;
  const totalCols = isMobile ? 8 : 16;
  const colW = (vw - edge * 2 - gap * (totalCols - 1)) / totalCols;
  const unit = Math.max(vh / 100, vw * 0.0145);
  return { edge, gap, colW, unit, isMobile, vh, vw };
}

function baseTileRect(tile: Tile) {
  const { edge, gap, colW, unit, isMobile } = getMetrics();
  const start = isMobile ? Math.min(tile.start, 8) : tile.start;
  const span = isMobile ? Math.min(tile.cols, 4) : tile.cols;
  const w = span * colW + (span - 1) * gap;
  const x = edge + (start - 1) * (colW + gap);
  const [rw, rh] = tile.ratio.split("/").map(Number);
  const h = w * (rh / rw);
  const y = tile.rhythm * unit * 9;
  return { x, y, w, h };
}

const GRID_X = 12;
const GRID_Y = 12;

function createMeshProgram(gl: WebGLRenderingContext) {
  const vs = `
    attribute vec2 a_position;
    attribute vec2 a_texcoord;
    uniform vec2 u_resolution;
    uniform vec4 u_rect; 
    uniform vec2 u_mouse; 
    uniform float u_mouseStrength;
    uniform float u_scrollVel; 
    varying vec2 v_texcoord;

    void main() {
      vec2 meshPos = a_position; 

      if (u_mouseStrength > 0.001 && u_mouse.x >= 0.0) {
        vec2 delta = meshPos - u_mouse;
        float dist = length(delta);
        float falloff = exp(-dist * dist * 12.0); 
        meshPos += delta * falloff * u_mouseStrength * 0.08;
      }

      float scrollBend = u_scrollVel * 0.0015;
      float curveX = (meshPos.x - 0.5) * 2.0; 
      float curveY = meshPos.y;
      meshPos.y += scrollBend * curveX * curveX * (curveY - 0.5);
      meshPos.x += scrollBend * 0.2 * (curveY - 0.5);

      vec2 pixel = u_rect.xy + meshPos * u_rect.zw;
      vec2 clip = (pixel / u_resolution) * 2.0 - 1.0;
      clip.y = -clip.y;
      gl_Position = vec4(clip, 0.0, 1.0);
      v_texcoord = a_texcoord;
    }
  `;
  const fs = `
    precision mediump float;
    varying vec2 v_texcoord;
    uniform sampler2D u_image;
    void main() {
      gl_FragColor = texture2D(u_image, v_texcoord);
    }
  `;

  function compile(type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const positions: number[] = [];
  const texcoords: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= GRID_Y; iy++) {
    for (let ix = 0; ix <= GRID_X; ix++) {
      positions.push(ix / GRID_X, iy / GRID_Y);
      texcoords.push(ix / GRID_X, iy / GRID_Y);
    }
  }
  for (let iy = 0; iy < GRID_Y; iy++) {
    for (let ix = 0; ix < GRID_X; ix++) {
      const tl = iy * (GRID_X + 1) + ix;
      const tr = tl + 1;
      const bl = tl + (GRID_X + 1);
      const br = bl + 1;
      indices.push(tl, bl, tr, tr, bl, br);
    }
  }

  const posBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tcBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, tcBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
  const aTc = gl.getAttribLocation(prog, "a_texcoord");
  gl.enableVertexAttribArray(aTc);
  gl.vertexAttribPointer(aTc, 2, gl.FLOAT, false, 0, 0);

  const idxBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    prog,
    indexCount: indices.length,
    u: {
      resolution: gl.getUniformLocation(prog, "u_resolution")!,
      rect: gl.getUniformLocation(prog, "u_rect")!,
      mouse: gl.getUniformLocation(prog, "u_mouse")!,
      mouseStrength: gl.getUniformLocation(prog, "u_mouseStrength")!,
      scrollVel: gl.getUniformLocation(prog, "u_scrollVel")!,
      image: gl.getUniformLocation(prog, "u_image")!,
    },
  };
}

export function MosaicRail({
  tiles,
  onOpen,
  frozen,
}: {
  tiles: Tile[];
  onOpen: (slug: string) => void;
  frozen: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const state = useRef({
    offset: 0,
    targetOffset: 0,
    prevOffset: 0,
    velocity: 0,
    loopH: 1,
    touchY: 0,
    raf: 0,
    mouseX: -1,
    mouseY: -1,
  });

  useEffect(() => {
    const recompute = () => {
      let maxBottom = 0;
      for (const tile of tiles) {
        const r = baseTileRect(tile);
        maxBottom = Math.max(maxBottom, r.y + r.h);
      }
      state.current.loopH = Math.max(maxBottom + window.innerHeight * 0.2, window.innerHeight * 1.5);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [tiles]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });

    let mesh: ReturnType<typeof createMeshProgram> | null = null;
    if (gl && !reduced) {
      try {
        mesh = createMeshProgram(gl);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      } catch {
        mesh = null;
      }
    }

    const textures = new Map<number, WebGLTexture>();

    function loadTexture(idx: number, src: string) {
      if (!gl || !mesh) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!gl) return;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        textures.set(idx, tex);
      };
      img.src = src;
    }

    tiles.forEach((t, i) => loadTexture(i, t.image));

    const els = () => container.querySelectorAll<HTMLElement>("[data-idx]");
    const tileHover = new Map<number, { mx: number; my: number; strength: number }>();

    function update() {
      const { vh, vw } = getMetrics();
      const s = state.current;

      const diff = s.targetOffset - s.offset;
      if (Math.abs(diff) > 0.05) {
        s.offset += diff * 0.18;
      } else {
        s.offset = s.targetOffset;
      }

      s.velocity = s.offset - s.prevOffset;
      s.prevOffset = s.offset;

      const lh = s.loopH;
      while (s.offset > lh) { s.offset -= lh; s.targetOffset -= lh; s.prevOffset -= lh; }
      while (s.offset < 0) { s.offset += lh; s.targetOffset += lh; s.prevOffset += lh; }

      const offset = s.offset;
      const clampedV = Math.max(-15, Math.min(15, s.velocity));
      const items = els();

      if (gl && mesh && canvas) {
        if (canvas.width !== vw * devicePixelRatio || canvas.height !== vh * devicePixelRatio) {
          canvas.width = vw * devicePixelRatio;
          canvas.height = vh * devicePixelRatio;
          canvas.style.width = `${vw}px`;
          canvas.style.height = `${vh}px`;
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(mesh.prog);
        gl.uniform2f(mesh.u.resolution, vw, vh);
        gl.uniform1f(mesh.u.scrollVel, clampedV);
      }

      items.forEach((el) => {
        const idx = Number(el.dataset.idx);
        const tile = tiles[idx];
        if (!tile) return;
        const r = baseTileRect(tile);

        let rawY = r.y - offset;
        rawY = ((rawY % lh) + lh) % lh;
        if (rawY > lh - r.h && rawY > vh) rawY -= lh;
        if (rawY < -r.h - vh * 0.5) rawY += lh;

        el.style.transform = `translate3d(${r.x}px, ${rawY}px, 0)`;
        el.style.width = `${r.w}px`;
        el.style.height = `${r.h}px`;

        const visible = rawY > -r.h - 200 && rawY < vh + 200;
        el.style.visibility = visible ? "visible" : "hidden";

        const hover = tileHover.get(idx);
        if (hover) {
          hover.strength *= 0.92;
          if (hover.strength < 0.001) tileHover.delete(idx);
        }

        if (gl && mesh && visible) {
          const tex = textures.get(idx);
          if (tex) {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(mesh.u.image, 0);
            gl.uniform4f(mesh.u.rect, r.x, rawY, r.w, r.h);

            const h = tileHover.get(idx);
            if (h && h.strength > 0.001) {
              gl.uniform2f(mesh.u.mouse, h.mx, h.my);
              gl.uniform1f(mesh.u.mouseStrength, h.strength);
            } else {
              gl.uniform2f(mesh.u.mouse, -1, -1);
              gl.uniform1f(mesh.u.mouseStrength, 0);
            }

            gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
            el.style.opacity = "0.001";
          }
        } else if (!gl || !mesh) {
          el.style.opacity = "1";
          if (!reduced && visible) {
            const img = el.querySelector<HTMLElement>(".mosaic-tile__img");
            if (img) {
              const skewY = clampedV * 0.18;
              const scaleY = 1 + Math.abs(clampedV) * 0.003;
              img.style.transform = `scaleY(${scaleY.toFixed(4)}) skewY(${skewY.toFixed(2)}deg)`;
            }
          }
        }
      });

      s.raf = requestAnimationFrame(update);
    }

    state.current.raf = requestAnimationFrame(update);

    const onWheel = (e: WheelEvent) => {
      if (frozen) return;
      e.preventDefault();
      state.current.targetOffset += e.deltaY * 1.0;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (frozen) return;
      state.current.touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (frozen) return;
      const y = e.touches[0].clientY;
      const dy = state.current.touchY - y;
      state.current.touchY = y;
      state.current.targetOffset += dy;
      state.current.offset = state.current.targetOffset;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (frozen) return;
      const s = state.current;
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;

      const { vh: viewH } = getMetrics();
      const items = els();
      items.forEach((el) => {
        const idx = Number(el.dataset.idx);
        const tile = tiles[idx];
        if (!tile) return;

        const rect = el.getBoundingClientRect();
        if (s.mouseX >= rect.left && s.mouseX <= rect.right && s.mouseY >= rect.top && s.mouseY <= rect.bottom) {
          const localX = (s.mouseX - rect.left) / rect.width;
          const localY = (s.mouseY - rect.top) / rect.height;
          tileHover.set(idx, { mx: localX, my: localY, strength: 1.0 });
        }
      });
    };

    const parent = container.parentElement!;
    parent.addEventListener("wheel", onWheel, { passive: false });
    parent.addEventListener("touchstart", onTouchStart, { passive: true });
    parent.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(state.current.raf);
      parent.removeEventListener("wheel", onWheel);
      parent.removeEventListener("touchstart", onTouchStart);
      parent.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
      if (gl) {
        textures.forEach((tex) => gl.deleteTexture(tex));
      }
    };
  }, [tiles, frozen]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden"
      style={{
        opacity: frozen ? 0 : 1,
        transition: "opacity .8s cubic-bezier(.65,0,.35,1)",
        pointerEvents: frozen ? "none" : "auto",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ width: "100%", height: "100%" }}
      />
      <div ref={containerRef} className="absolute inset-0 z-[2]">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1}>
            {tiles.map((tile, i) => (
              <button
                key={`${copy}-${tile.image}-${i}`}
                data-idx={i}
                onClick={() => onOpen(tile.project)}
                className="mosaic-tile absolute left-0 top-0 block overflow-hidden text-left"
                data-cursor="label"
                data-cursor-label={tile.caption}
                aria-label={tile.caption}
              >
                <span className="mosaic-tile__media block h-full w-full overflow-hidden">
                  <img
                    src={tile.image}
                    alt={tile.alt}
                    loading="eager"
                    decoding="async"
                    className="mosaic-tile__img block h-full w-full object-cover"
                    style={{ transformOrigin: "center center", transition: "transform .08s linear" }}
                  />
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
