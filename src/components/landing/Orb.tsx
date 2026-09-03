/**
 * The hero's focal visual: a large luminous sphere, built in CSS.
 *
 * The reference this follows leads with a rendered 3D object, and that single
 * dimensional light source is what stops the page reading as a template. There
 * is no render here, so the depth is assembled instead: a dark base sphere,
 * blurred colour blobs blended on top as caustics, a bright rim along the
 * upper-left where the light falls, and a soft ambient glow spilling outward.
 *
 * `mix-blend-screen` is what sells it - the colour blobs add light rather than
 * painting over each other, which is how light actually behaves inside a
 * translucent object.
 *
 * Purely decorative, so it is hidden from assistive technology entirely.
 */
export function HeroOrb() {
  return (
    <div aria-hidden className="pointer-events-none relative mx-auto h-[30rem] w-full max-w-[62rem] sm:h-[36rem]">
      {/* Ambient spill: the light the sphere throws onto the page around it. */}
      <div className="absolute left-1/2 top-1/2 h-[40rem] w-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(190,150,110,0.22),rgba(90,120,200,0.12),transparent)] blur-3xl" />

      <div className="absolute left-1/2 top-6 h-[30rem] w-[30rem] -translate-x-1/2 sm:h-[38rem] sm:w-[38rem]">
        {/*
          Base is near-black at the edge. The first attempt used a mid-grey and
          the whole thing read as a plastic ball: contrast is what makes a
          sphere look lit rather than flat, so the light has to sit against
          something genuinely dark.
        */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_36%_24%,#3c4152,#171a24_46%,#05060a_82%)]" />

        {/*
          Caustics: saturated, and only lightly blurred. Heavy blur averages the
          colours into grey, which is exactly what went wrong before - the light
          has to stay in distinct pools to read as refraction.
        */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute left-[10%] top-[52%] h-[46%] w-[70%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,186,84,1),rgba(255,160,60,0.35),transparent)] blur-xl mix-blend-screen" />
          <div className="absolute left-[40%] top-[62%] h-[30%] w-[44%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,228,168,1),transparent)] blur-lg mix-blend-screen" />
          <div className="absolute left-[54%] top-[44%] h-[26%] w-[30%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,140,60,0.9),transparent)] blur-lg mix-blend-screen" />
          <div className="absolute left-[4%] top-[58%] h-[32%] w-[30%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(56,120,240,0.95),transparent)] blur-xl mix-blend-screen" />
          <div className="absolute left-[62%] top-[66%] h-[24%] w-[26%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(70,150,255,0.7),transparent)] blur-xl mix-blend-screen" />
          <div className="absolute left-[56%] top-[22%] h-[26%] w-[30%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(168,120,240,0.55),transparent)] blur-xl mix-blend-screen" />
          <div className="absolute left-[24%] top-[74%] h-[20%] w-[34%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(80,220,205,0.45),transparent)] blur-xl mix-blend-screen" />
        </div>

        {/* Bright rim where the key light grazes the edge. */}
        <div className="absolute inset-0 rounded-full [background:conic-gradient(from_195deg_at_50%_50%,rgba(255,255,255,0.95),rgba(255,255,255,0.15)_18%,transparent_34%,transparent_66%,rgba(255,236,200,0.5)_88%,rgba(255,255,255,0.8))] [mask-image:radial-gradient(circle_closest-side,transparent_93%,black_96%,black_99%,transparent_100%)]" />

        {/* Warm bounce along the lower edge, from the caustics inside. */}
        <div className="absolute inset-0 rounded-full [background:conic-gradient(from_60deg_at_50%_50%,transparent,rgba(255,190,110,0.85)_18%,transparent_38%)] [mask-image:radial-gradient(circle_closest-side,transparent_94%,black_97.5%,transparent_100%)]" />

        {/* Specular highlight and its softer halo. */}
        <div className="absolute left-[26%] top-[15%] h-[13%] w-[22%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.9),transparent)] blur-md" />
        <div className="absolute left-[18%] top-[10%] h-[26%] w-[38%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.18),transparent)] blur-2xl" />

        {/* Contact shadow, so it sits in the page rather than floating. */}
        <div className="absolute inset-x-[14%] bottom-[-1%] h-12 rounded-[100%] bg-black/70 blur-2xl" />
      </div>
    </div>
  );
}

/**
 * Fixed star positions rather than random ones: a random field would differ
 * between the server and client renders and trip hydration.
 */
const STARS = [
  [8, 18, 1], [15, 42, 1], [22, 12, 2], [31, 55, 1], [38, 26, 1],
  [46, 8, 1], [54, 38, 2], [61, 15, 1], [69, 48, 1], [76, 22, 1],
  [84, 40, 2], [91, 14, 1], [12, 62, 1], [27, 72, 1], [43, 66, 1],
  [58, 78, 1], [72, 64, 1], [88, 70, 1], [4, 34, 1], [96, 52, 1],
] as const;

export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map(([left, top, size], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            height: `${size}px`,
            width: `${size}px`,
            opacity: size === 2 ? 0.5 : 0.28,
          }}
        />
      ))}
    </div>
  );
}
