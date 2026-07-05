import { animate } from 'framer-motion';

export const smoothScrollToBottom = (duration: number = 0.8) => {
  const targetScroll = document.documentElement.scrollHeight - window.innerHeight;
  
  // 이미 맨 아래에 도달했다면 무시
  if (window.scrollY >= targetScroll - 5) return;

  animate(window.scrollY, targetScroll, {
    duration: duration,
    ease: [0.25, 1, 0.5, 1], // 쫀득하고 시원한 '촤라라락' 느낌을 위한 곡선
    onUpdate: (latest) => {
      window.scrollTo(0, latest);
    }
  });
};

export const smoothScrollToElement = (elementRef: React.RefObject<HTMLElement | null>, duration: number = 0.8) => {
  if (!elementRef.current) return;
  
  const elementPosition = elementRef.current.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - 100; // 상단 고정 헤더(Sticky Header) 높이만큼 오프셋 적용

  animate(window.scrollY, offsetPosition, {
    duration: duration,
    ease: [0.25, 1, 0.5, 1],
    onUpdate: (latest) => window.scrollTo(0, latest)
  });
};

export const smoothScrollToId = (id: string, duration: number = 0.8) => {
  const element = document.getElementById(id);
  if (!element) return;
  
  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - 100; // 상단 고정 헤더(Sticky Header) 높이만큼 오프셋 적용

  animate(window.scrollY, offsetPosition, {
    duration: duration,
    ease: [0.25, 1, 0.5, 1],
    onUpdate: (latest) => window.scrollTo(0, latest)
  });
};
