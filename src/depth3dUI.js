import { reload, setBodyBackgroundColor } from './depth3d.js';
import { Pane } from 'tweakpane';
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

class Model {
	constructor(modelName, modelQuality, modelSize, modelUrl, modelInputSize) {
		this.modelName = modelName;
		this.modelQuality = modelQuality;
		this.modelSize = modelSize;
		this.modelUrl = modelUrl;
		this.modelInputSize = modelInputSize;
		this.menu = new ModelMenu(this);
		this.downloader = new ModelDownloader(this);
	}
}

class ModelDownloader {
	constructor(model) {
		this.model = model;
		this.isDownloaded = fs.existsSync(`${ModelDownloader.weightsPath}/${this.model.modelName}.pt`);
	}
	static weightsPath = null;

	static async getWeightsPath() {
		return new Promise((resolve, reject) => {
			ipcRenderer.send('get-weights-path');
			ipcRenderer.on('weights-path', (event, message) => {
				resolve(message);
			});
		});
	}
	download() {
		let file = this.model.menu.progressBarFill;
		ipcRenderer.send("download", {
			modelUrl: this.model.modelUrl,
			modelName: this.model.modelName,
		});
		ipcRenderer.on("download-progress", (event, progress, downloadedSize) => {
			file.style.width = `${progress}%`;
			this.model.menu.progressBarText.textContent = `${downloadedSize} / ${this.model.menu.modelSize}`;
		});
		ipcRenderer.on("download-completed", (event, file, modelName) => {
			this.model.menu.setModelToDownloadedMode();
		});
	}
}

class SideMenu {
	static sideMenu = document.getElementsByClassName('side-menu')[0];
	static logoName = document.getElementsByClassName('side-menu__logo-name')[0];
	static modelBtn = document.getElementsByClassName('vertical-menu__model-btn')[0];
	static modelBtnName = document.getElementsByClassName('model-btn__name')[0];
	static modelBtnIcon = document.getElementsByClassName('model-btn__icon--not-downloaded')[0];
	static modelBtnIconDownloaded = document.getElementsByClassName('model-btn__icon--downloaded')[0];
	static collapseMenuBtn = document.getElementsByClassName('footer__collapse-menu')[0];
	static dropImageBtn = document.getElementsByClassName('side-menu__drop-image')[0];
	static dropImageTextArea = document.getElementsByClassName('drop-image__text-area')[0];
	static dropImageText = document.getElementsByClassName('drop-image__text')[0];
	static darkMode = document.getElementsByClassName('footer__dark-mode')[0];
	static lightModeIcon = document.getElementsByClassName('dark-mode__light-mode-icon')[0];
	static darkModeIcon = document.getElementsByClassName('dark-mode__dark-mode-icon')[0];
	static isClosed = false;
	static isLightTheme = false;
	static activeModelBtn() {
		SideMenu.isLightTheme ? SideMenu.modelBtn.style.backgroundColor = "hsla(230, 7%, 75%, 0.8)" : SideMenu.modelBtn.style.backgroundColor = "var(--drop-image-color)";
		SideMenu.modelBtn.style.outline = "1px solid rgba(105, 105, 105, 0.4)";
	}
	static notActiveModelBtn() {
		SideMenu.modelBtn.style.backgroundColor = "";
		SideMenu.modelBtn.style.outline = "none";
	}
	static defaultModelButton() {
		SideMenu.modelBtnName.textContent = 'Choose a model';
		SideMenu.modelBtnIcon.style.display = "inline";
		SideMenu.modelBtnIconDownloaded.style.display = "none";
	}
	static setModelButton(modelName) {
		SideMenu.modelBtnName.textContent = modelName;
		SideMenu.modelBtnIcon.style.display = "none";
		SideMenu.modelBtnIconDownloaded.style.display = "inline";
	}
	static hideDropImage() {
		SideMenu.dropImageBtn.style.display = 'none';
	}
	static showDropImage() {
		SideMenu.dropImageBtn.style.display = 'flex';
	}
	static toggleTheme() {
		SideMenu.isLightTheme ? SideMenu.isLightTheme = false : SideMenu.isLightTheme = true
		document.documentElement.classList.toggle('light-mode');
		if (ModelMenu.isMenuOpen && ModelMenu.selectedModel) {
			ModelMenu.selectedModel.menu.selectModel();
			SideMenu.activeModelBtn();
		}
		else if (ModelMenu.isMenuOpen && !ModelMenu.selectedModel) {
			SideMenu.activeModelBtn();
		}
		else if (!ModelMenu.isMenuOpen && ModelMenu.selectedModel) {
			ModelMenu.selectedModel.menu.selectModel();
		}
		setBodyBackgroundColor();
	}
	static collapseMenu() {
		ModelMenu.modelMenu.style.left = '87px';
		SideMenu.sideMenu.style.width = '42px';
		SideMenu.collapseMenuBtn.style.transition = '0.2s';
		SideMenu.collapseMenuBtn.style.transform = 'rotate(180deg)';
		SideMenu.logoName.style.display = "none";
		SideMenu.modelBtnName.style.display = "none";
		SideMenu.dropImageTextArea.style.display = "none";
		SideMenu.dropImageBtn.style.margin = "0px -18px";
		SideMenu.isClosed = true;
	}
	static expandMenu() {
		ModelMenu.modelMenu.style.left = '245px';
		SideMenu.sideMenu.style.width = '200px';
		SideMenu.collapseMenuBtn.style.transition = '0.2s';
		SideMenu.collapseMenuBtn.style.transform = 'rotate(0deg)';
		SideMenu.logoName.style.display = "inline";
		SideMenu.modelBtnName.style.display = "inline";
		SideMenu.dropImageTextArea.style.display = "inline";
		SideMenu.dropImageBtn.style.margin = "0px";
		SideMenu.isClosed = false;
	}
}

class ModelMenu {
	constructor(model) {
		this.model = model;
		this.modelQuality = this.model.modelQuality;
		this.modelSize = this.model.modelSize;
		this.modelTemplate = document.importNode(document.getElementById(`model-template`).content, true);
		this.modelMenuBtn = this.modelTemplate.querySelector('.model');
		this.modelName = this.modelTemplate.querySelector('.model__name');
		this.icon = this.modelTemplate.querySelector('.model__icon--not-downloaded');
		this.iconDownloaded = this.modelTemplate.querySelector('.model__icon--downloaded');
		this.quality = this.modelTemplate.querySelector('.model__quality');
		this.size = this.modelTemplate.querySelector('.btn__size');
		this.status = this.modelTemplate.querySelector('.btn__status--not-downloaded');
		this.progressBar = this.modelTemplate.querySelector('.btn__progress-bar');
		this.progressBarFill = this.modelTemplate.querySelector('.progress-bar__fill');
		this.progressBarText = this.modelTemplate.querySelector('.progress-bar__text');
		this.downloadText = this.modelTemplate.querySelector('.download__text');
		this.downloadBtn = this.modelTemplate.querySelector('.btn__download');
		this.downloadIcon = this.modelTemplate.querySelector('.download__icon--download');
		this.deleteIcon = this.modelTemplate.querySelector('.download__icon--delete');
		this.modelOptions = this.modelTemplate.querySelector('.model__options');
		this.params = {
			depthmapGaussianBlur: 9,
			heightMapMedianFilter: 25,
			modelInputSize: this.model.modelInputSize,
		};
	}
	static modelMenu = document.getElementsByClassName('model-menu')[0];
	static dropdown = document.getElementsByClassName('model-menu__dropdown')[0];
	static isMenuOpen = false;
	static selectedModel = null;
	addModelToMenu() {
		this.modelName.innerHTML = this.model.modelName;
		this.quality.innerHTML = this.model.menu.modelQuality;
		this.size.innerHTML = `Size: ${this.model.menu.modelSize}`;
		this.setModelOptions();
		ModelMenu.dropdown.appendChild(this.modelTemplate);
	}
	selectModel() {
		SideMenu.isLightTheme ? this.modelMenuBtn.style.backgroundColor = "hsla(230, 7%, 75%, 0.8)" : this.modelMenuBtn.style.backgroundColor = "var(--drop-image-color)"
		this.modelMenuBtn.style.outline = "1px solid rgba(105, 105, 105, 0.4)";
		this.modelMenuBtn.style.paddingBottom = "110px";
		this.modelMenuBtn.style.transition = "padding 0.2s cubic-bezier(0.165, 0.84, 0.44, 1), transform 0.2s cubic-bezier(0.165, 0.84, 0.44, 1), background-color 0.2s cubic-bezier(0.165, 0.84, 0.44, 1)";
		this.iconDownloaded.style.fill = "rgba(84, 199, 80, 0.4)";
		this.modelName.style.color = "var(--text-color)";
		this.modelOptions.style.display = "block";
		SideMenu.setModelButton(this.model.modelName);
		ModelMenu.selectedModel = this.model;
	}
	unselectModel() {
		this.modelMenuBtn.style.backgroundColor = "";
		this.modelMenuBtn.style.outline = "";
		this.modelMenuBtn.style.paddingBottom = "";
		this.iconDownloaded.style.fill = "var(--text-color-dimmed)";
		this.modelName.style.color = "var(--text-color-dimmed)";
		this.modelOptions.style.display = "none";
	}
	removeModel() {
		ipcRenderer.send("delete-model", {
			modelName: this.model.modelName,
		});
		if (ModelMenu.selectedModel === this.model) {
			this.model.menu.unselectModel();
			SideMenu.defaultModelButton();
			SideMenu.hideDropImage();
		}
		this.status.className = 'btn__status--not-downloaded';
		this.status.textContent = 'Not downloaded';
		this.downloadText.textContent = 'Download';
		this.icon.style.display = "inline";
		this.iconDownloaded.style.display = "none";
		this.deleteIcon.style.display = 'none';
		this.downloadIcon.style.display = 'inline';
		this.downloadBtn.classList.remove('downloaded');
		this.model.downloader.isDownloaded = false;
		this.modelMenuBtn.style.backgroundColor = "";
		this.modelMenuBtn.style.outline = "";
	}
	setModelToDownloadedMode() {
		this.progressBar.style.display = 'none';
		this.downloadIcon.style.display = 'none';
		this.deleteIcon.style.display = 'inline';
		this.size.style.display = 'inline';
		this.model.menu.size.textContent = `Size: ${this.model.menu.modelSize}`;
		this.status.className = 'model__status--downloaded';
		this.status.textContent = 'Downloaded';
		this.status.style.display = 'inline';
		this.downloadText.textContent = 'Delete';
		this.icon.style.display = "none";
		this.iconDownloaded.style.display = "inline";
		this.downloadBtn.style.pointerEvents = 'auto';
		this.downloadBtn.classList.toggle('downloaded');
		this.model.downloader.isDownloaded = true;
	}
	setModelToDownloadingMode() {
		this.downloadText.textContent = 'Downloading';
		this.downloadBtn.style.pointerEvents = 'none';
		this.status.style.display = 'none';
		this.progressBar.style.display = 'flex';
	}
	static openMenu() {
		ModelMenu.modelMenu.style.display = "block";
		ModelMenu.isMenuOpen = true;
	}
	static closeMenu() {
		ModelMenu.modelMenu.style.display = "none";
		ModelMenu.isMenuOpen = false;
	}
	setModelOptions() {
		let pane = new Pane({
			container: this.modelOptions,
		});

		pane.addBinding(this.params, 'modelInputSize', {
			label: 'Model input size',
			step: 32,
			min: this.params.modelInputSize - 128,
			max: this.params.modelInputSize + 256,
			disabled: this.model.modelName === 'depth_pro',
		});
		pane.addBinding(this.params, 'depthmapGaussianBlur', {
			label: 'Depth map gaussian blur',
			step: 2,
			min: 1,
			max: 31,
		});
		pane.addBinding(this.params, 'heightMapMedianFilter', {
			label: 'Height map median filter',
			step: 2,
			min: 1,
			max: 127,
		});
	}
}

ModelDownloader.weightsPath = await ModelDownloader.getWeightsPath();

let depth_pro = new Model(
	'depth_pro',
	'Best quality',
	'1.77 GB',
	'https://ml-site.cdn-apple.com/models/depth-pro/depth_pro.pt',
	1536
);

let dpt_beit_large_512 = new Model(
	'dpt_beit_large_512',
	'High quality',
	'1.48 GB',
	'https://github.com/isl-org/MiDaS/releases/download/v3_1/dpt_beit_large_512.pt',
	512
);

let dpt_large_384 = new Model(
	'dpt_large_384',
	'High quality',
	'1.28 GB',
	'https://github.com/isl-org/MiDaS/releases/download/v3/dpt_large_384.pt',
	384
);

let midas_v21_small_256 = new Model(
	'midas_v21_small_256',
	'Low quality',
	'81.8 MB',
	'https://github.com/isl-org/MiDaS/releases/download/v2_1/midas_v21_small_256.pt',
	256
);

for (const model of [depth_pro, dpt_beit_large_512, dpt_large_384, midas_v21_small_256]) {
	model.menu.addModelToMenu();
	if (model.downloader.isDownloaded) {
		model.menu.setModelToDownloadedMode();
	}
	model.menu.downloadBtn.addEventListener("click", () => {
		if (model.downloader.isDownloaded) {
			model.menu.removeModel();
		}
		else {
			model.menu.setModelToDownloadingMode();
			model.downloader.download();
		}
	});
}

SideMenu.collapseMenuBtn.addEventListener("click", () => {
	if (SideMenu.isClosed) {
		SideMenu.expandMenu();
	}
	else {
		SideMenu.collapseMenu();
	}
});

SideMenu.darkMode.addEventListener("click", () => {
	SideMenu.toggleTheme();
});

ModelMenu.modelMenu.addEventListener("click", (ev) => {
	for (const model of [depth_pro, dpt_beit_large_512, dpt_large_384, midas_v21_small_256]) {
		if (ModelMenu.isMenuOpen && model.menu.modelMenuBtn.contains(ev.target) && !model.menu.modelOptions.contains(ev.target) && model.downloader.isDownloaded) {
			if (ModelMenu.selectedModel) {
				ModelMenu.selectedModel.menu.unselectModel();
				if (ModelMenu.selectedModel === model) {
					SideMenu.defaultModelButton();
					SideMenu.hideDropImage();
					ModelMenu.selectedModel = null;
          return;
				}
			}
      model.menu.selectModel();
      SideMenu.showDropImage();
		}
	}
});

window.addEventListener("click", (ev) => {
	if (ModelMenu.isMenuOpen && SideMenu.modelBtn.contains(ev.target) || 
		ModelMenu.isMenuOpen && !ModelMenu.modelMenu.contains(ev.target) && !SideMenu.darkMode.contains(ev.target) && !SideMenu.collapseMenuBtn.contains(ev.target)) {
		SideMenu.notActiveModelBtn();
		ModelMenu.closeMenu();
	}
	else if (!ModelMenu.isMenuOpen && SideMenu.modelBtn.contains(ev.target)) {
		SideMenu.activeModelBtn();
		ModelMenu.openMenu();
	}
});

document.getElementById("drop-image__input").onchange = (ev) => {
	const formData = ev.target.files;
	if (ModelMenu.selectedModel === null || formData.length === 0) {
		return
	}
	const loadingSvg = document.getElementsByClassName("canvas-area__loading-svg")[0];
  const logoIcon = document.getElementsByClassName("side-menu__logo-icon")[0];
	const threeTweakpane = document.getElementsByClassName("canvas-area__tweakpane")[0];
  loadingSvg.style.display = 'flex';
	threeTweakpane.style.display = 'none';
  logoIcon.src = './icons/icon_512x512.gif';
	SideMenu.dropImageBtn.style.pointerEvents = 'none';
	const reader = new FileReader();
	reader.readAsDataURL(formData[0]);
	reader.onload = () => {
		const dataUrl = reader.result;
		ipcRenderer.send("process-image", {
			dataUrl: dataUrl,
			selectedModel: ModelMenu.selectedModel.modelName,
			modelInputSize: ModelMenu.selectedModel.menu.params.modelInputSize,
			depthmapGaussianBlur: ModelMenu.selectedModel.menu.params.depthmapGaussianBlur,
			heightMapMedianFilter: ModelMenu.selectedModel.menu.params.heightMapMedianFilter,
		});
		ipcRenderer.on("depth-map-ready", async (evt, message) => {
      await reload(message.isSuccessful)
			loadingSvg.style.display = 'none';
			threeTweakpane.style.display = 'inline';
      logoIcon.src = './icons/icon.png';
			ev.target.value = "";
			SideMenu.dropImageBtn.style.pointerEvents = 'all';
		});
	};
}