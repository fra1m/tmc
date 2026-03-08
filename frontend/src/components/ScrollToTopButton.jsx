import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 320;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <button
      type="button"
      className={`scroll-top-button${visible ? " visible" : ""}`}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Прокрутить вверх"
      title="Наверх"
    >
      ↑
    </button>
  );
}
