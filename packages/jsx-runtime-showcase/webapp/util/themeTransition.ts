/**
 * # themeTransition, radial "ink-drop" theme switch
 *
 * Plays a circular reveal whose origin is the theme-toggle button.
 *
 * ## Why an overlay, not `startViewTransition`
 *
 * The obvious implementation is `document.startViewTransition`: let the
 * browser snapshot the page, swap the theme, and crossfade. But UI5
 * loads the new theme's per-library CSS **asynchronously** — the swap
 * isn't painted for ~100 ms (warm) up to seconds (cold first load).
 * `startViewTransition` *freezes the page on the old snapshot* until
 * its callback resolves, so waiting for the real paint means a visible
 * multi-hundred-ms (or multi-second) freeze; and if held too long the
 * browser abandons the transition outright. Not waiting brings the
 * flicker back (the reveal animates old colours, then the repaint snaps
 * in). Either way it's wrong for an async theme swap.
 *
 * So we use a **flat-colour overlay** that never freezes the page:
 *
 *   1. Drop a full-viewport overlay filled with the *outgoing* theme's
 *      surface colour. The user still sees the old theme.
 *   2. Swap the theme underneath. The page repaints live behind the
 *      overlay whenever UI5's CSS lands — no freeze, no snapshot.
 *   3. Open a circular *hole* in the overlay at the button and grow it
 *      to cover the viewport. Through the hole the new-theme page shows
 *      through, so the new theme spreads out from the button.
 *
 * The reveal grows button → full page (not the reverse): the hole is
 * the new theme flooding outward from where you clicked. Because the
 * overlay is a flat colour and the page underneath is the real
 * (already-swapped) new theme, page content is never hidden — it's
 * progressively uncovered, so there's nothing to flicker and the
 * reveal is a fixed, snappy 420 ms regardless of CSS-load time.
 *
 * The hole is a rectangle-minus-circle `clip-path` animated per-frame
 * with `requestAnimationFrame` — CSS can't interpolate an inverse
 * circle on its own.
 *
 * Reduced-motion is respected: `prefers-reduced-motion: reduce` skips
 * the animation and just runs `updateFn`.
 */

const DURATION_MS = 420;

/**
 * Fire the transition. `originEl` is the element the animation
 * emanates from (typically the theme-toggle button); its centre on
 * screen becomes the circle's origin. `updateFn` performs the theme
 * swap (it may be sync or async; we don't await it — the overlay masks
 * whatever repaint timing UI5's async CSS load produces).
 */
export function playThemeTransition(
	originEl: Element | null | undefined,
	updateFn: () => void | Promise<void>
): void {
	if (prefersReducedMotion() || !originEl) {
		void updateFn();
		return;
	}

	const rect = originEl.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	// Distance from the button's centre to the farthest viewport
	// corner. That's the radius the hole must reach to uncover the
	// whole viewport by end-of-animation.
	const endRadius = Math.hypot(
		Math.max(cx, window.innerWidth - cx),
		Math.max(cy, window.innerHeight - cy)
	);

	// Capture the *outgoing* theme's surface colour BEFORE the swap so
	// the overlay matches what's currently on screen. Reading the live
	// `--sapBackgroundColor` keeps it exact in either direction; the
	// dark/light literals are a safety net if the variable is empty.
	const oldSurface = currentSurfaceColor();

	// Swap the theme now. We deliberately don't await it: the overlay
	// covers the viewport in the old colour, so the live repaint behind
	// it is invisible until the hole grows past each pixel.
	void updateFn();

	runOverlayReveal(cx, cy, endRadius, oldSurface);
}

/**
 * Read the current theme's page surface colour from the CSS variable
 * UI5 maintains, falling back to the Horizon light/dark body colours
 * if it's not resolvable yet.
 */
function currentSurfaceColor(): string {
	const probe = getComputedStyle(document.body).getPropertyValue("--sapBackgroundColor").trim();
	if (probe) return probe;
	const isDark = document.documentElement.getAttribute("data-jsx-theme") === "dark";
	return isDark ? "#12171c" : "#ffffff";
}

/**
 * `clip-path` describing the overlay as "the whole viewport MINUS a
 * circle of radius `r` at (cx, cy)". Uses the `evenodd` fill rule: the
 * outer rectangle is filled, the inner circle is subtracted, leaving a
 * hole. As `r` grows the hole grows, so the page shows through from the
 * origin outwards.
 */
function holeClipPath(cx: number, cy: number, r: number): string {
	const w = window.innerWidth;
	const h = window.innerHeight;
	// Two half-arcs trace the circle; radius is clamped >= 0.
	const rr = Math.max(0, r);
	return (
		`path(evenodd, '` +
		`M0 0 H${w} V${h} H0 Z ` +
		`M${cx - rr} ${cy} a${rr} ${rr} 0 1 0 ${rr * 2} 0 a${rr} ${rr} 0 1 0 ${-rr * 2} 0 Z` +
		`')`
	);
}

/**
 * Drop the outgoing-theme overlay and grow a circular hole in it from
 * the origin to full cover, revealing the (already-swapped) new-theme
 * page beneath. Animated per-frame; removes itself when done, with a
 * timeout safety net.
 */
function runOverlayReveal(cx: number, cy: number, endRadius: number, surface: string): void {
	const overlay = document.createElement("div");
	overlay.setAttribute("data-jsx-theme-transition-overlay", "");
	overlay.style.cssText =
		`position: fixed;` +
		`inset: 0;` +
		`z-index: 99999;` +
		`pointer-events: none;` +
		`background: ${surface};` +
		`clip-path: ${holeClipPath(cx, cy, 0)};`;
	document.body.appendChild(overlay);

	let start: number | null = null;
	let done = false;
	const finish = (): void => {
		if (done) return;
		done = true;
		overlay.remove();
	};
	// easeInOutCubic — matches the cubic-bezier(0.4, 0, 0.2, 1) feel of
	// the rest of the app's motion.
	const ease = (t: number): number =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

	const step = (now: number): void => {
		if (start === null) start = now;
		const t = Math.min(1, (now - start) / DURATION_MS);
		const r = ease(t) * endRadius;
		overlay.style.clipPath = holeClipPath(cx, cy, r);
		if (t < 1) {
			requestAnimationFrame(step);
		} else {
			finish();
		}
	};
	requestAnimationFrame(step);

	// Safety cleanup in case rAF is starved (e.g. tab backgrounded
	// mid-switch) and never reaches t === 1.
	setTimeout(finish, DURATION_MS + 500);
}

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || !window.matchMedia) return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
