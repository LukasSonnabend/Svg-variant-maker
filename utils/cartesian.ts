
/**
 * Computes the Cartesian product of an array of arrays.
 * e.g. [[a,b], [c,d]] -> [[a,c], [a,d], [b,c], [b,d]]
 */
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => {
      const next: T[][] = [];
      acc.forEach((a) => {
        curr.forEach((b) => {
          next.push([...a, b]);
        });
      });
      return next;
    },
    [[]]
  );
}
