import * as THREE from "three";
let SimplexNoise = require('simplex-noise'),
    simplex = new SimplexNoise(Math.random);

function clamp(a){
  return Math.max(0,Math.min(1,a));
}
export default function getGeometry(detail,offsettop){
  offsettop = offsettop || 0;
  let geometry = new THREE.BufferGeometry();
  let number = detail;
  let width = 2;
  let height = 2;
  
  let gran = width/number;
  let granH = gran*Math.sqrt(3)/2;
  let rows = height/granH;

  let offsets = []
  let positions = [];
  let centroids = [];
  let control0 = [];
  let control1 = [];
  let randoms = [];
  let uvs = [];
  let currentShift = 0;
  let bary = [];
  let currentheight = 0;
  let numberOfTriangles = 0;
  let scale = 2;

  for (let j = 0; j < rows; j++) {
    currentheight = j*granH;
    if(j%2===1){ currentShift = -gran/2;}
    else{currentShift = 0;}
    for (let i = 0; i <= number; i++) {
      let sign = Math.sign(i*gran + currentShift - width/2)
      // sign =1
      // first triangle
      positions.push(i*gran + currentShift - width/2,currentheight - height/2,0);
      uvs.push((i*gran + currentShift)/width, (currentheight)/height)
      positions.push(i*gran + gran/2 + currentShift - width/2,granH + currentheight - height/2,0);
      uvs.push((i*gran + gran/2 + currentShift)/width, (granH + currentheight)/height)
      positions.push(i*gran - gran/2 + currentShift - width/2,granH + currentheight - height/2,0);
      uvs.push((i*gran - gran/2 + currentShift)/width, (granH + currentheight)/height)

      let simp = simplex.noise2D(i/rows, j/rows) + Math.random()
      let o = clamp(currentheight/height + 2*simp/detail);
      let r = Math.random()
      offsets.push(o,clamp(o + 0.1*offsettop),clamp(o + 0.1*offsettop));
      randoms.push(r,r,r);
      let c = [i*gran + currentShift - width/2,currentheight - height/2,0];
      centroids.push(...c,...c,...c)

      let ctrl0 = [
       scale*sign*THREE.Math.randFloat(-.3, 0.3),
       -scale*THREE.Math.randFloat(-.3, 0.3) * 1.5,
       -THREE.Math.randFloatSpread(.5)
       ];
      let ctrl1 = [
       scale*sign*THREE.Math.randFloat(0.3, 0.6),
       -scale*THREE.Math.randFloat(0.3, 0.6) * 1.5,
       -THREE.Math.randFloatSpread(.5)
       ];
      control0.push(...ctrl0,...ctrl0,...ctrl0)
      control1.push(...ctrl1,...ctrl1,...ctrl1)


      bary.push(0,0,1, 0,1,0, 1,0,0);
      // second triangle
      positions.push(i*gran + currentShift - width/2,currentheight - height/2,0);
      uvs.push((i*gran + currentShift)/width, (currentheight)/height)
      positions.push(i*gran + gran + currentShift - width/2,currentheight - height/2,0);
      uvs.push((i*gran + gran + currentShift)/width, (currentheight)/height)
      positions.push(i*gran + gran/2 + currentShift - width/2,granH + currentheight - height/2,0);
      uvs.push((i*gran + gran/2 + currentShift)/width, (granH + currentheight)/height)
      
      simp = simplex.noise2D((i+1)/rows, j/rows) + Math.random()
      let o1 = clamp(currentheight/height + 2*simp/detail);
      r = Math.random()
      offsets.push(o1,o1,clamp(o1 + 0.1*offsettop));
      randoms.push(r,r,r);
      let c1 = [i*gran + currentShift - width/2,currentheight - height/2,0]
      
      control0.push(...ctrl0,...ctrl0,...ctrl0)
      control1.push(...ctrl1,...ctrl1,...ctrl1)

      centroids.push(...c1,...c1,...c1)
      bary.push(0,0,1, 0,1,0, 1,0,0);

      numberOfTriangles += 2;
    }
  }
  // console.log(control1,control0,centroids);
  geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(positions), 3 ) );
  geometry.addAttribute( 'bary', new THREE.BufferAttribute( new Float32Array(bary), 3 ) );
  geometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array(uvs), 2 ) );
  geometry.addAttribute( 'offset', new THREE.BufferAttribute( new Float32Array(offsets), 1 ) );
  geometry.addAttribute( 'centroid1', new THREE.BufferAttribute( new Float32Array(centroids), 3 ) );
  geometry.addAttribute( 'control0', new THREE.BufferAttribute( new Float32Array(control0), 3 ) );
  geometry.addAttribute( 'control1', new THREE.BufferAttribute( new Float32Array(control1), 3 ) );
  geometry.addAttribute( 'random', new THREE.BufferAttribute( new Float32Array(randoms), 1 ) );

  return geometry;
}