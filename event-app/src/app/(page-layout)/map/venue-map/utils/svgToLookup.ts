export interface ElementPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  type: string;
}

export interface SVGLookup {
  [key: string]: ElementPosition;
}

export function svgToLookup(svgElement: SVGSVGElement | null): SVGLookup {
  if (!svgElement) return {};

  const lookup: SVGLookup = {};
  
  // Find all elements with IDs (excluding the root svg and g containers)
  const elementsWithIds = svgElement.querySelectorAll('[id]:not(svg):not(g)');
  
  elementsWithIds.forEach((element) => {
    if (!(element instanceof SVGGraphicsElement)) return;
    
    const id = element.id;
    if (!id) return;
    
    try {
      // Check if element has a transform attribute
      const transform = element.getAttribute('transform');
      
      if (transform && transform.includes('rotate')) {
        // For rotated elements, parse the rotation and calculate the actual center
        const rotateMatch = transform.match(/rotate\(([-\d.]+)(?:\s+([-\d.]+)\s+([-\d.]+))?\)/);
        const bbox = element.getBBox();
        
        if (rotateMatch && rotateMatch[2] && rotateMatch[3]) {
          // rotation angle, cx, cy (center of rotation)
          const cx = parseFloat(rotateMatch[2]);
          const cy = parseFloat(rotateMatch[3]);
          
          // For elements rotated around a specific point, that point is often the top-left corner
          // The pin should be at the actual center of the rotated shape
          lookup[id] = {
            id,
            x: cx,
            y: cy,
            width: bbox.width,
            height: bbox.height,
            centerX: cx + bbox.width / 2,
            centerY: cy + bbox.height / 2,
            type: element.tagName.toLowerCase()
          };
        } else {
          // Fallback for other rotation formats
          const bbox = element.getBBox();
          const matrix = (element as any).getCTM();
          if (matrix) {
            const point = svgElement.createSVGPoint();
            point.x = bbox.x + bbox.width / 2;
            point.y = bbox.y + bbox.height / 2;
            const transformedPoint = point.matrixTransform(matrix);
            
            lookup[id] = {
              id,
              x: transformedPoint.x - bbox.width / 2,
              y: transformedPoint.y - bbox.height / 2,
              width: bbox.width,
              height: bbox.height,
              centerX: transformedPoint.x,
              centerY: transformedPoint.y,
              type: element.tagName.toLowerCase()
            };
          } else {
            // Fallback to regular bbox if can't get transform matrix
            lookup[id] = {
              id,
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
              centerX: bbox.x + bbox.width / 2,
              centerY: bbox.y + bbox.height / 2,
              type: element.tagName.toLowerCase()
            };
          }
        }
      } else {
        // For non-transformed elements, use regular getBBox
        const bbox = element.getBBox();
        
        lookup[id] = {
          id,
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          centerX: bbox.x + bbox.width / 2,
          centerY: bbox.y + bbox.height / 2,
          type: element.tagName.toLowerCase()
        };
      }
    } catch (error) {
      // Some elements might not have a bounding box (e.g., empty elements)
      console.warn(`Could not get bounding box for element ${id}:`, error);
    }
  });
  
  return lookup;
}

// Helper function to get groups and their child elements
export function svgToLookupWithGroups(svgElement: SVGSVGElement | null): {
  elements: SVGLookup;
  groups: { [key: string]: string[] };
} {
  if (!svgElement) return { elements: {}, groups: {} };
  
  const elements = svgToLookup(svgElement);
  const groups: { [key: string]: string[] } = {};
  
  // Find all g elements with IDs
  const groupElements = svgElement.querySelectorAll('g[id]');
  
  groupElements.forEach((group) => {
    const groupId = group.id;
    if (!groupId) return;
    
    // Get all child elements with IDs
    const childIds = Array.from(group.querySelectorAll('[id]:not(g)'))
      .map(el => el.id)
      .filter(Boolean);
    
    if (childIds.length > 0) {
      groups[groupId] = childIds;
    }
  });
  
  return { elements, groups };
}

// Helper to get position in viewport coordinates (useful for absolute positioning)
export function getViewportPosition(
  id: string,
  container: Element,
  element: SVGElement
): ElementPosition | null {
  if (!(element instanceof SVGGraphicsElement)) return null;

  try {
    // Check if element has a transform attribute (same logic as svgToLookup)
    const transform = element.getAttribute('transform');

    if (transform && transform.includes('rotate')) {
      // For rotated elements, parse the rotation and calculate the actual center
      const rotateMatch = transform.match(/rotate\(([-\d.]+)(?:\s+([-\d.]+)\s+([-\d.]+))?\)/);
      const bbox = element.getBBox();

      if (rotateMatch && rotateMatch[2] && rotateMatch[3]) {
        // rotation angle, cx, cy (center of rotation)
        const cx = parseFloat(rotateMatch[2]);
        const cy = parseFloat(rotateMatch[3]);

        // Same calculation as svgToLookup
        return {
          id,
          x: cx,
          y: cy,
          width: bbox.width,
          height: bbox.height,
          centerX: cx + bbox.width / 2,
          centerY: cy + bbox.height / 2,
          type: element.tagName.toLowerCase()
        };
      } else {
        // Fallback for other rotation formats using transformation matrix
        const svgElement = element.ownerSVGElement;
        if (!svgElement) return null;

        const matrix = (element as any).getCTM();
        if (matrix) {
          const point = svgElement.createSVGPoint();
          point.x = bbox.x + bbox.width / 2;
          point.y = bbox.y + bbox.height / 2;
          const transformedPoint = point.matrixTransform(matrix);

          return {
            id,
            x: transformedPoint.x - bbox.width / 2,
            y: transformedPoint.y - bbox.height / 2,
            width: bbox.width,
            height: bbox.height,
            centerX: transformedPoint.x,
            centerY: transformedPoint.y,
            type: element.tagName.toLowerCase()
          };
        } else {
          // Fallback to regular bbox if can't get transform matrix
          return {
            id,
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            centerX: bbox.x + bbox.width / 2,
            centerY: bbox.y + bbox.height / 2,
            type: element.tagName.toLowerCase()
          };
        }
      }
    } else {
      // For non-transformed elements, use regular getBBox
      const bbox = element.getBBox();

      return {
        id,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        centerX: bbox.x + bbox.width / 2,
        centerY: bbox.y + bbox.height / 2,
        type: element.tagName.toLowerCase()
      };
    }
  } catch (error) {
    console.warn(`Could not get viewport position for element ${id}:`, error);
    return null;
  }
}