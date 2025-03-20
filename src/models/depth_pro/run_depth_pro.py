import sys
import torch
import numpy as np
from PIL import Image
import cv2
from matplotlib import pyplot as plt
from depth_pro import create_model_and_transforms, DEFAULT_MONODEPTH_CONFIG_DICT


def run(depthmap_gaussian_blur, weights_path, imgPath):
    DEFAULT_MONODEPTH_CONFIG_DICT.checkpoint_uri = weights_path + "/depth_pro.pt"
    model, transform = create_model_and_transforms(
        device=torch.device("cpu"),
        precision=torch.float32,
    )

    model.eval()

    img_pil = Image.open(imgPath + '/input_image')

    img = np.array(img_pil)
    # Convert to RGB if single channel.
    if img.ndim < 3 or img.shape[2] == 1:
        img = np.dstack((img, img, img))

    # Remove_alpha:
    img = img[:, :, :3]

    img = transform(img)
    with torch.no_grad():
        prediction = model.infer(img, f_px=None)
    # Extract the depth and focal length.
    depth = prediction["depth"].detach().cpu().numpy().squeeze()

    inverse_depth = 1 / depth
    # Visualize inverse depth instead of depth, clipped to [0.1m;250m] range for better visualization.
    max_invdepth_vizu = min(inverse_depth.max(), 1 / 0.1)
    min_invdepth_vizu = max(1 / 250, inverse_depth.min())
    inverse_depth_normalized = (inverse_depth - min_invdepth_vizu) / (max_invdepth_vizu - min_invdepth_vizu)

    cmap = plt.get_cmap("gist_gray")
    color_depth = (cmap(inverse_depth_normalized)[..., :3] * 255).astype(np.uint8)
    result = cv2.GaussianBlur(color_depth, (int(depthmap_gaussian_blur), int(depthmap_gaussian_blur)), cv2.BORDER_DEFAULT)
    Image.fromarray(result).save(imgPath + "/depth_map", format="JPEG", quality=95)
    return

if __name__ == "__main__":
    run(sys.argv[2], sys.argv[3], sys.argv[4])