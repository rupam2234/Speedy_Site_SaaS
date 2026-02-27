/**
 * applies debounce on a function
 * @param fn the function to debounce
 * @param delay delay required
 * @returns debounce callback of the function 
 */
export function debounce(fn: () => void, delay: number) {
    let timer: ReturnType<typeof setTimeout>;

    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => fn(), delay);
    };
  }

