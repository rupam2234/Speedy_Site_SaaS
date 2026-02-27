import { RefObject } from "react";

interface Props {
    fn:()=> void, 
    rootMargin: string;
    refObj: RefObject<null>
}

/**
 * Sets up an IntersectionObserver on the provided element reference
 * and invokes the given callback function once the element becomes visible
 * in the viewport (according to the specified rootMargin).
 * @param fn - Callback function to execute when the element enters the viewport.
 * @param refObj - React ref object pointing to the DOM element to observe.
 * @param rootMargin - Margin around the root (viewport) used to expand or shrink
* the intersection area (e.g., "0px", "100px", "50px 0px").
 * @returns A cleanup function that disconnects the observer.
 */
export function lazyload({fn, refObj, rootMargin}: Props){
    if(!refObj.current){
        return;
    }

    const obserber = new IntersectionObserver(([entry])=> {
        if(entry.isIntersecting){
            fn();
            obserber.disconnect();
        }
    }, {
        rootMargin: rootMargin
    })

    obserber.observe(refObj.current);
    return()=> obserber.disconnect();
}