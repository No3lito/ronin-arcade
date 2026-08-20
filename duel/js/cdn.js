// CDN fallback map — permanent fal.media URLs for every runtime image the
// game loads. Used when the local path 404s (the Netlify upload proxy drops
// binary files); fal serves with `access-control-allow-origin: *`, so frames
// stay readable for the canvas keying passes.
export const CDN_MAP = {
  'assets/runtime/arena-blood-moon.webp': 'https://v3b.fal.media/files/b/0aa6c35e/pByv9Pj26olIIvTP-C9Mf_arena-blood-moon.webp',
  'assets/runtime/dual-art0.webp': 'https://v3b.fal.media/files/b/0aa6c360/bZzcDQIuNH9Q8crutdyJO_dual-art0.webp',
  'assets/runtime/dual-art1.webp': 'https://v3b.fal.media/files/b/0aa6c374/YdCntCl18mWs6XU_CJq6j_dual-art1.webp',
  'assets/runtime/dual-art2.webp': 'https://v3b.fal.media/files/b/0aa6c361/GjLIY4nARWT1jP4J_uiQA_dual-art2.webp',
  'assets/runtime/dual-art3.webp': 'https://v3b.fal.media/files/b/0aa6c361/7TuYHvv6kGmz3tcZ1T1ja_dual-art3.webp',
  'assets/runtime/dual-idle.webp': 'https://v3b.fal.media/files/b/0aa6c360/FYWzDnlHqVzARey-1RysK_dual-idle.webp',
  'assets/runtime/dual-run.webp': 'https://v3b.fal.media/files/b/0aa6c360/edl1LK7DDfFql0ita8yYH_dual-run.webp',
  'assets/runtime/oni-poses.webp': 'https://v3b.fal.media/files/b/0aa6c3b7/26PFmHaEU2qUU9XGoVG4j_oni-poses-dark.webp',
  'assets/runtime/player-hurt-anim.webp': 'https://v3b.fal.media/files/b/0aa6c35f/V4DNHIUGQGjIeeA_SXPi8_player-hurt-anim.webp',
  'assets/runtime/player-jump-anim.webp': 'https://v3b.fal.media/files/b/0aa6c35f/zdyD65JeFhehKHjpBvsQn_player-jump-anim.webp',
  'assets/runtime/player-special.webp': 'https://v3b.fal.media/files/b/0aa6c373/PTj44HvVH2av5duiHgE1M_player-special.webp',
  'assets/runtime/rite-sign.webp': 'https://v3b.fal.media/files/b/0aa6c361/wYI53IWDCq6vEP237G-W9_rite-sign.webp',
  'assets/runtime/ronin-idle.webp': 'https://v3b.fal.media/files/b/0aa6c371/Z-3DE1ul2Phtvn6f0mOGw_ronin-idle.webp',
  'assets/runtime/ronin-run-v2.webp': 'https://v3b.fal.media/files/b/0aa6c35e/5lBjJmh77NbbfYn9ORo9O_ronin-run-v2.webp',
  'assets/runtime/ronin-slash-v2.webp': 'https://v3b.fal.media/files/b/0aa6c35e/ITHW_VcRLG3iPv9YZUjob_ronin-slash-v2.webp',
  'assets/runtime/rival-idle.webp': 'https://v3b.fal.media/files/b/0aa6c4a3/DzpE6TaRuqU3RAvrsEEZu_rival-idle.webp',
  'assets/runtime/rival-run.webp': 'https://v3b.fal.media/files/b/0aa6c491/XNfBfGTum5K6-IpXo-JZo_rival-run.webp',
  'assets/runtime/rival-atk0.webp': 'https://v3b.fal.media/files/b/0aa6c4a5/r1mXUz0Sb71U6etA8KzT-_rival-atk0.webp',
  'assets/runtime/rival-atk1.webp': 'https://v3b.fal.media/files/b/0aa6c492/IfTFfkVXihahHHC2Y7Q-M_rival-atk1.webp',
  'assets/runtime/rival-atk2.webp': 'https://v3b.fal.media/files/b/0aa6c4a6/y1iDstR0RQJjye4yfxT_4_rival-atk2.webp',
  'assets/runtime/rival-hurt.webp': 'https://v3b.fal.media/files/b/0aa6c4a7/PCubTvn6jytpqFwUZ7Tfh_rival-hurt.webp',
};
