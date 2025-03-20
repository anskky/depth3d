import sys
import cv2
import torch
import matplotlib.pyplot as plt
import numpy as np
from torchvision.transforms import Compose
from dpt_depth import DPTDepthModel
from transforms import Resize, NormalizeImage, PrepareForNet

def run(model_input_size, depthmap_gaussian_blur, weights_path, imgPath):
    midas = DPTDepthModel(
            path=weights_path + "/dpt_beit_large_512.pt",
            backbone="beitl16_512",
            non_negative=True,
            )
    net_w, net_h = int(model_input_size), int(model_input_size) 
    resize_mode = "minimal"
    device = torch.device("cpu")
    normalization = NormalizeImage(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    transform = Compose(
            [
                Resize(
                    net_w,
                    net_h,
                    resize_target=None,
                    keep_aspect_ratio=True,
                    ensure_multiple_of=32,
                    resize_method=resize_mode,
                    image_interpolation_method=cv2.INTER_CUBIC,
                ),
                normalization,
                PrepareForNet(),
            ]
        )
    midas.to(device)
    midas.eval()

    img = cv2.imread(imgPath + '/input_image')
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) / 255
    input_batch = transform({"image": img})["image"]
    with torch.no_grad():
        sample = torch.from_numpy(input_batch).unsqueeze(0)
        prediction = midas.forward(sample)
        prediction = (
            torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=img.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze().cpu().numpy()
        )
    #prediction = prediction.clamp(min=0, max=255)
    result = cv2.GaussianBlur(prediction, (int(depthmap_gaussian_blur), int(depthmap_gaussian_blur)), cv2.BORDER_DEFAULT)
    plt.imsave(imgPath + '/depth_map', result,  cmap='gist_gray', format='jpg')
    return

if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])