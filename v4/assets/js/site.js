/*!
 * site.js: small site glue for Prof. Vaishali S. Ingale's portfolio. All scroll motion lives in motion.js.
 *  - navState(): the translucent navbar gets a hairline once the page scrolls.
 *  - refreshSince(): "Years at AIT" (data-since="YYYY-MM-DD" from _data/stats.yml) is recomputed in the
 *    browser, so the number stays right without a rebuild. Runs before motion.js reads data-count.
 */
!function(){"use strict";function t(t){return Array.prototype.slice.call(document.querySelectorAll(t))}function e(){var t=document.getElementById("navbar");if(t){var e=function(){t.classList.toggle("is-scrolled",(window.scrollY||window.pageYOffset||0)>8)};e(),window.addEventListener("scroll",e,{passive:!0})}}function n(){t("[data-since]").forEach(function(t){var e=(t.getAttribute("data-since")||"").split("-");if(!(e.length<3)){var n=new Date(+e[0],+e[1]-1,+e[2]),o=new Date,a=o.getFullYear()-n.getFullYear();(o.getMonth()<n.getMonth()||o.getMonth()===n.getMonth()&&o.getDate()<n.getDate())&&a--,a>0&&(t.setAttribute("data-count",String(a)),t.textContent=String(a))}})}function o(){e(),n()}"loading"===document.readyState?document.addEventListener("DOMContentLoaded",o):o()}();