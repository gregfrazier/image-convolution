'use strict';
const container = document.getElementById('cSurface');
const canvasReadFrom = document.createElement('canvas');
const canvasDrawTo = document.createElement('canvas');

container.appendChild(canvasReadFrom);
container.appendChild(canvasDrawTo);

const GreenWallTexture = new Image();
// GreenWallTexture.setAttribute('crossOrigin', '');
GreenWallTexture.src = 'pexels-photo-67094.png';

const SurfaceReadFrom = canvasReadFrom.getContext('2d');
const SurfaceDrawTo = canvasDrawTo.getContext('2d');
let srcWidth = 0, srcHeight;

const Kernels = {
    Sobel: {
        passes: 2,
        kernelSize: { x: 3, y: 3 },
        kernel: [
            [
                [ 1,  0, -1],
                [ 2,  0, -2],
                [ 1,  0, -1]
            ],
            [
                [ 1,  2,  1],
                [ 0,  0,  0],
                [-1, -2, -1]
            ]
        ],
        depth: ['g'],
        fn: (v, k) => {
            let color = ~~Math.sqrt((v[0] * v[0]) + (k[0] * k[0]));
            return {
                r: color,
                g: color,
                b: color
            };
        }
    },
    SobelFeldman: {
        passes: 2,
        kernelSize: { x: 3, y: 3 },
        kernel: [
            [
                [3, 0, -3],
                [10, 0, -10],
                [3, 0, -3]
            ],
            [
                [3, 10, 3],
                [0, 0, 0],
                [-3, -10, -3]
            ]
        ],
        depth: ['g'],
        fn: (v, k) => {
            let color = ~~Math.sqrt((v[0] * v[0]) + (k[0] * k[0]));
            return {
                r: color,
                g: color,
                b: color
            };
        }
    },
    Gaussian5x5: { 
        passes: 1,
        kernelSize: { x: 5, y: 5 },
        kernel: [[
            [1,4,6,4,1],
            [4,16,24,16,4],
            [6,24,36,24,6],
            [4,16,24,16,4],
            [1,4,6,4,1]
        ]],
        depth: ['r','g','b'],
        fn: (v) => {
            return {
                r: ~~((0.0039) * v[0]),
                g: ~~((0.0039) * v[1]),
                b: ~~((0.0039) * v[2])
            };
        }
    },
    Unsharp5x5: { 
        passes: 1,
        kernelSize: { x: 5, y: 5 },
        kernel: [[
            [1,4,6,4,1],
            [4,16,24,16,4],
            [6,24,-476,24,6],
            [4,16,24,16,4],
            [1,4,6,4,1]
        ]],
        depth: ['r','g','b'],
        fn: (v) => {
            return {
                r: ~~((-0.0039) * v[0]),
                g: ~~((-0.0039) * v[1]),
                b: ~~((-0.0039) * v[2])
            };
        }
    },
    Sharpen: { 
        passes: 1,
        kernelSize: { x: 3, y: 3 },
        kernel: [[
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ]],
        depth: ['r','g','b'],
        fn: (v) => {
            return { r: v[0], g: v[1], b: v[2] };
        }
    },
    BoxBlur: { 
        passes: 1,
        kernelSize: { x: 3, y: 3 },
        kernel: [[
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1]
        ]],
        depth: ['r','g','b'],
        fn: (v) => {
            return {
                r: ~~((0.1111) * v[0]),
                g: ~~((0.1111) * v[1]),
                b: ~~((0.1111) * v[2])
            };
        }
    },
    Emboss: { 
        passes: 1,
        kernelSize: { x: 3, y: 3 },
        kernel: [[
            [-2, -1, 0],
            [-1, 1, 1],
            [0, 1, 2]
        ]],
        depth: ['r','g','b'],
        fn: (v) => {
            return { r: v[0], g: v[1], b: v[2] };
        }
    },
    Gradient: {
        passes: 2,
        kernelSize: { x: 3, y: 3 },
        kernel: [
            [
                [-1, -1, -1],
                [0, 0, 0],
                [1, 1, 1]
            ],
            [
                [-1, 0, 1],
                [-1, 0, 1],
                [-1, 0, 1]
            ]
        ],
        depth: ['g'],
        fn: (v, k) => {
            let color = ~~Math.sqrt((v[0] * v[0]) + (k[0] * k[0]));
            return {
                r: color,
                g: color,
                b: color
            };
        }
    }
};

GreenWallTexture.onload = function () {
    srcWidth = GreenWallTexture.naturalWidth;
    srcHeight = GreenWallTexture.naturalHeight;
    canvasReadFrom.width = srcWidth;
    canvasReadFrom.height = srcHeight;
    canvasDrawTo.width = srcWidth;
    canvasDrawTo.height = srcHeight;
    SurfaceReadFrom.drawImage(GreenWallTexture, 0, 0);
    let SurfaceReadFromData = SurfaceReadFrom.getImageData(0, 0, srcWidth, srcHeight);
    let SurfaceFloorBufferData = SurfaceDrawTo.createImageData(srcWidth, srcHeight);

    SurfaceDrawTo.fillStyle = 'rgb(255,255,255)';
    SurfaceDrawTo.font = '26px serif';

    document.querySelector("#filterType").addEventListener("change", (v) => {
        const filterValue = v.target.selectedOptions[0].value;
        if(filterValue != null && filterValue != 'noFilter') {
            SurfaceReadFromData = SurfaceReadFrom.getImageData(0, 0, srcWidth, srcHeight);
            for (let x = 0; x < srcWidth; x++)
                for (let y = 0; y < srcHeight; y++) {
                    let pixelData = getKernelBitmap(SurfaceReadFromData, srcWidth, srcHeight, x, y, 
                        Kernels[filterValue].kernelSize.x, Kernels[filterValue].kernelSize.y);
                    let xPass = 
                        [...Array(Kernels[filterValue].passes)].map((x,i) => {
                            return applyMatrix(Kernels[filterValue].kernel[i], pixelData, 
                                Kernels[filterValue].kernelSize.x, Kernels[filterValue].kernelSize.y, Kernels[filterValue].depth);
                        });

                    setBitmapPoint(SurfaceFloorBufferData, x, y, Kernels[filterValue].fn.apply(null, xPass));
                }
            SurfaceDrawTo.putImageData(SurfaceFloorBufferData, 0, 0, 0, 0, srcWidth, srcHeight);
            SurfaceDrawTo.fillText(filterValue, 25, 25);
        }
    });

    document.querySelector("#swap").addEventListener("click", (v) => {                
        SurfaceReadFrom.putImageData(SurfaceFloorBufferData, 0, 0, 0, 0, srcWidth, srcHeight);
    });
};
let applyMatrix = (m, pixelArr, kernelX, kernelY, props) => {
    let ans = [...Array(props.length)].map(x => 0);
    for(let yp = 0; yp < kernelY; yp++)
        for(let xp= 0; xp < kernelX; xp++) {
             props.forEach((d, idx) => {
                 ans[idx] += pixelArr[yp][xp][d] * m[yp][xp];
             });                    
        }
    return ans; 
};
let getKernelBitmap = (imageData, imgW, imgH, startX, startY, kernelW, kernelH) => {
    let imageMat = [],
        kernelH2 = ~~(kernelH / 2), 
        kernelW2 = ~~(kernelW / 2);
    for(let row = (0 - kernelH2); row < 1 + kernelH2; ++row) {
        imageMat.push([]);
        for(let col = (0 - kernelW2); col < 1 + kernelW2; ++col)
            imageMat[imageMat.length - 1].push(getBitmapPoint(imageData, col + startX, row + startY));
    }
    return imageMat;
};
let getBitmapPoint = function (imageData, x, y) {
    const w = imageData.width, h = imageData.height;
    if(x < 0 || x > w || y < 0 || y > h) {
        x = (w + x) % w;
        y = (h + y) % h;
    }
    const idx = (x + srcWidth * y) * 4;
    return { r: imageData.data[idx],
             g: imageData.data[idx + 1],
             b: imageData.data[idx + 2] };
};
let setBitmapPoint = function (imageData, x, y, color) {
    const idx = (x + srcWidth * y) * 4;
    imageData.data[idx] = color.r > 255 ? 255 : color.r;
    imageData.data[idx + 1] = color.g > 255 ? 255 : color.g;
    imageData.data[idx + 2] = color.b > 255 ? 255 : color.b;
    imageData.data[idx + 3] = 255;
};