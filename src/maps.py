import sys
import cv2
import numpy as np
import scipy.ndimage
import scipy.misc
from PIL import Image, ImageFilter, ImageOps

def smooth_gaussian(im, sigma):
    if sigma == 0:
        return im

    im_smooth = im.astype(float)
    kernel_x = np.arange(-3 * sigma, 3 * sigma+1).astype(float)
    kernel_x = np.exp((-(kernel_x ** 2)) / (2 * (sigma ** 2)))

    im_smooth = scipy.ndimage.convolve(im_smooth, kernel_x[np.newaxis])
    im_smooth = scipy.ndimage.convolve(im_smooth, kernel_x[np.newaxis].T)

    return im_smooth


def gradient(im_smooth):
    gradient_x = im_smooth.astype(float)
    gradient_y = im_smooth.astype(float)

    kernel = np.arange(-1, 2).astype(float)
    kernel = - kernel / 2

    gradient_x = scipy.ndimage.convolve(gradient_x, kernel[np.newaxis])
    gradient_y = scipy.ndimage.convolve(gradient_y, kernel[np.newaxis].T)

    return gradient_x, gradient_y


def sobel(im_smooth):
    gradient_x = im_smooth.astype(float)
    gradient_y = im_smooth.astype(float)

    kernel = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])

    gradient_x = scipy.ndimage.convolve(gradient_x, kernel)
    gradient_y = scipy.ndimage.convolve(gradient_y, kernel.T)

    return gradient_x, gradient_y


def compute_normal_map(gradient_x, gradient_y, intensity=1):
    width = gradient_x.shape[1]
    height = gradient_x.shape[0]
    max_x = np.max(gradient_x)
    max_y = np.max(gradient_y)

    max_value = max_x

    if max_y > max_x:
        max_value = max_y

    normal_map = np.zeros((height, width, 3), dtype=np.float32)

    intensity = 1 / intensity

    strength = max_value / (max_value * intensity)

    normal_map[..., 0] = gradient_x / max_value
    normal_map[..., 1] = gradient_y / max_value
    normal_map[..., 2] = 1 / strength

    norm = np.sqrt(np.power(normal_map[..., 0], 2)+np.power(normal_map[..., 1], 2)+np.power(normal_map[..., 2], 2))

    normal_map[..., 0] /= norm
    normal_map[..., 1] /= norm
    normal_map[..., 2] /= norm

    normal_map *= 0.5
    normal_map += 0.5

    return normal_map


def main(height_map_median_filter,  img_path):
    #Input image
    try:
        input_img = Image.open(f'{img_path}/input_image')
    except:
        raise Exception ('Cannot read the image')
    img_format = input_img.format
    input_img.save(f'{img_path}/input_image', img_format)

    #Height map
    height_map = input_img
    height_map = ImageOps.grayscale(height_map)
    height_map = ImageOps.invert(height_map)
    height_map = height_map.filter(ImageFilter.SMOOTH)
    height_map = np.array(height_map)
    height_map = cv2.medianBlur(height_map, ksize=int(height_map_median_filter))
    # height_map = height_map.filter(ImageFilter.MedianFilter(size=int(grayscaleMedianFilter)))
    height_map = Image.fromarray(height_map)
    height_map.save(f'{img_path}/height_map', img_format)
    
    #Normal map
    sigma = 2
    intensity = 2
    np_img = np.array(input_img)
    im = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
    if im.ndim == 3:
        im_grey = np.zeros((im.shape[0], im.shape[1])).astype(float)
        im_grey = (im[..., 0] * 0.3+im[..., 1] * 0.6+im[..., 2] * 0.1)
        im = im_grey

    im_smooth = smooth_gaussian(im, sigma)
    sobel_x, sobel_y = sobel(im_smooth)
    normal_map = compute_normal_map(sobel_x, sobel_y, intensity)
    normal_map[:, :, 1] = 255 - normal_map[:, :, 1]
    normal_map = Image.fromarray((normal_map * 255).astype(np.uint8))
    normal_map.save(f'{img_path}/normal_map', img_format)
    return

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])