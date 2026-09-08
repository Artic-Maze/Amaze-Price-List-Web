// window.initSwiper = function (section_id) {
//     const swiperEl = document.querySelector(`.swiper.swiper-${section_id}.slider`);
//     if (!swiperEl) return null;

//     // Destroy previous instance if it exists
//     if (swiperEl.swiper) {
//       swiperEl.swiper.destroy(true, true);
//     }

//     const nextEl = document.querySelector(`.swiper.swiper-${section_id} .swiper-button-next--${section_id}`);
//     const prevEl = document.querySelector(`.swiper.swiper-${section_id} .swiper-button-prev--${section_id}`);
//     const paginationEl = document.querySelector(`.swiper.swiper-${section_id} .swiper-pagination--${section_id}`);

//     new Swiper(swiperEl, {
//       slidesPerView: 1.2,
//       spaceBetween: 16,
//       slidesPerGroup: 1,
//       watchOverflow: true,
//       observer: true,
//       observeParents: true,

//       breakpoints: {
//         768: {
//           slidesPerView: 3,
//           spaceBetween: 30,
//           slidesPerGroup: 3,
//         },
//       },

//       navigation:
//         nextEl && prevEl
//           ? {
//               nextEl: nextEl,
//               prevEl: prevEl,
//             }
//           : false,

//       pagination: paginationEl
//         ? {
//             el: paginationEl,
//             clickable: true,
//           }
//         : false,
//     });
//   };


// window.initSwiper('{{ section.id }}', desktopSlideCount, desktopGap, mobileSlideCount, mobileGap);
// window.initSwiper('{{ section.id }}', 4, 20, 1.2, 12);

window.initSwiper = function (
  sectionId,
  desktopSlideCount = 3,
  desktopGap = 30,
  mobileSlideCount = 1.2,
  mobileGap = 16
) {
  const swiperEl = document.querySelector(
    `.swiper.swiper-${sectionId}.slider`
  );

  if (!swiperEl || typeof Swiper === 'undefined') return null;

  const toNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  desktopSlideCount = toNumber(desktopSlideCount, 3);
  desktopGap = toNumber(desktopGap, 30);
  mobileSlideCount = toNumber(mobileSlideCount, 1.2);
  mobileGap = toNumber(mobileGap, 16);

  // Destroy the previous Swiper instance
  if (swiperEl.swiper && !swiperEl.swiper.destroyed) {
    swiperEl.swiper.destroy(true, true);
  }

  const nextEl = swiperEl.querySelector(
    `.swiper-button-next--${sectionId}`
  );

  const prevEl = swiperEl.querySelector(
    `.swiper-button-prev--${sectionId}`
  );

  const paginationEl = swiperEl.querySelector(
    `.swiper-pagination--${sectionId}`
  );

  return new Swiper(swiperEl, {
    slidesPerView: mobileSlideCount,
    spaceBetween: mobileGap,
    slidesPerGroup: 1,

    watchOverflow: true,
    observer: true,
    observeParents: true,

    breakpoints: {
      768: {
        slidesPerView: desktopSlideCount,
        spaceBetween: desktopGap,
        slidesPerGroup: desktopSlideCount,
      },
    },

    navigation:
      nextEl && prevEl
        ? {
            nextEl,
            prevEl,
          }
        : false,

    pagination: paginationEl
      ? {
          el: paginationEl,
          clickable: true,
        }
      : false,
  });
};