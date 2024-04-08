import React from "react";
import css from "./text-morph.module.scss";

type TextMorphProps = {
  texts: string[];
};

export default (props: TextMorphProps) => {
  React.useEffect(() => {
    const elts = {
      text1: document.getElementById("text1"),
      text2: document.getElementById("text2"),
    } as any;

    // The strings to morph between. You can change these to anything you want!
    const texts = props.texts;

    // Controls the speed of morphing.
    const morphTime = 1;
    const cooldownTime = 6;

    let textIndex = texts.length - 1;
    let time = new Date() as any;
    let morph = 0;
    let cooldown = cooldownTime;

    elts.text1.textContent = texts[textIndex % texts.length];
    elts.text2.textContent = texts[(textIndex + 1) % texts.length];

    function doMorph() {
      morph -= cooldown;
      cooldown = 0;

      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    }

    // A lot of the magic happens here, this is what applies the blur filter to the text.
    function setMorph(fraction: any) {
      // fraction = Math.cos(fraction * Math.PI) / -2 + .5;

      elts.text2.style.filter = `blur(${
        Math.min(8 / fraction - 8, 100) / 4
      }px)`;
      elts.text2.style.opacity = `${Math.pow(fraction, 0.8) * 100}%`;

      fraction = 1 - fraction;
      elts.text1.style.filter = `blur(${
        Math.min(8 / fraction - 8, 100) / 4
      }px)`;
      elts.text1.style.opacity = `${Math.pow(fraction, 0.8) * 100}%`;

      elts.text1.textContent = texts[textIndex % texts.length];
      elts.text2.textContent = texts[(textIndex + 1) % texts.length];
    }

    function doCooldown() {
      morph = 0;

      elts.text2.style.filter = "";
      elts.text2.style.opacity = "100%";

      elts.text1.style.filter = "";
      elts.text1.style.opacity = "0%";
    }

    let animationFrame: number;

    // Animation loop, which is called every frame.
    function animate() {
      animationFrame = requestAnimationFrame(animate);

      let newTime = new Date() as any;
      let shouldIncrementIndex = cooldown > 0;
      let dt = (newTime - time) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex++;
        }

        doMorph();
      } else {
        doCooldown();
      }
    }

    // Start the animation.
    animate();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [props.texts]);

  return (
    <div className={`${css["container"]} justify-center lg:justify-center`}>
      <span className={`${css["text1"]} opacity-0 !block !relative`}>
        {props.texts[1]}
      </span>
      <span className={css["text1"]} id="text1"></span>
      <span className={css["text2"]} id="text2"></span>
      <svg className={css["filters"]}>
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
									0 1 0 0 0
									0 0 1 0 0
									0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

// <!-- Explanation in JS tab -->

// <!-- The two texts -->
// <div id="container">
// 	<span id="text1"></span>
// 	<span id="text2"></span>
// </div>

// <!-- The SVG filter used to create the merging effect -->
// <svg id="filters">
// 	<defs>
// 		<filter id="threshold">
// 			<!-- Basically just a threshold effect - pixels with a high enough opacity are set to full opacity, and all other pixels are set to completely transparent. -->
// 			<feColorMatrix in="SourceGraphic"
// 					type="matrix"
// 					values="1 0 0 0 0
// 									0 1 0 0 0
// 									0 0 1 0 0
// 									0 0 0 255 -140" />
// 		</filter>
// 	</defs>
// </svg>
