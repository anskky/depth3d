# depth3d

## Overview

Depth3d allows you to transform JPEG, JPG, PNG images into 3D models using monocular depth estimation. You can select the desired depth estimation model, download it locally into depth3d, and use it to reconstruct a 3D model from an image. You can utilize built-in features to control the depth intensity, adjust the resolution and size, and export the 3D model in formats such as glTF, GLB, STL, OBJ.

![depth3d_overview](https://github.com/user-attachments/assets/6964b5fe-c704-4268-bde0-fdf6861c6089)

## Source Installation

1.  **Clone the Repository:**
    ```
    git clone https://github.com/anskky/depth3d.git
    ```
    
3.  **Navigate to the depth3d Directory:**
    ```
    cd ./depth3d
    ```
    
4.  **Install Electron Forge CLI:**
    This project uses Electron Forge for building the application.
    ```
    npm install --save-dev @electron-forge/cli
    ```
    
5.  **Create a Virtual Environment:**
    ```
    python3 -m venv .venv
    ```
    
6.  **Activate the Virtual Environment:**
    - For **Windows**:
      ```
      .venv\Scripts\activate
      ```

    - For **Linux/macOS**:
      ```
      source .venv/bin/activate
      ```
      
7.  **Install Python Dependencies:**
    - For **Windows/macOS**:
      ```
      pip3 install torch torchvision timm opencv-python matplotlib scipy pillow
      ```
      
    - For **Linux**:
      ```
      pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu
      pip3 install timm opencv-python matplotlib scipy pillow
      ```
      
8.  **Start:**
    ```
    npm start
    ```
    
9.  **Build:**
    ```
    npm run make
    ```
