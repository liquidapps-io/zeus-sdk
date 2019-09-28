/**
 * Promise based timeout delay
 *
 * @param {number} ms Milisecond delay
 * @return {Promise<void>}
 * @example
 *
 * await delay(100);
 */
export function delay( ms: number ) {
  return new Promise( ( resolve ) => {
      setTimeout( () => {
          resolve();
      }, ms );
  } );
}
