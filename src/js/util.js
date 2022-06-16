
function kmNodeUpdateText(km, node, text) {
    if (node.getText() != text) {
        node.setText(text);
        km.refresh();
        km.fire('contentchange');
    }
}


/**
 * 给kity-minder添加双击编辑的支持
 * @param {*} km 
 * @returns 
 */
function addEditFeature(km) {
    let style = document.createElement("style");
    style.innerHTML = `
    .kity-minder-inputer {
        font-family: "微软雅黑", "Consolas";
        position: absolute;
        word-break: break-all;
        overflow-y: hidden;
        outline: none;
        border-radius: 2px;
        line-height: 14px;
        resize: none;      
    }
    `;
    document.body.appendChild(style);

    function strLen(str) {
        let len = 0;
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            //单字节加1   
            if ((c >= 0x0001 && c <= 0x007e) || (0xff60 <= c && c <= 0xff9f)) {
                len++;
            } else {
                len += 2;
            }
        }
        return len;
    }

    let input = document.createElement("textarea");
    input.setAttribute("class", "kity-minder-inputer");
    let selectNode = null;
    let inputBox = {
        show(selectedNode) {
            if (selectNode) {
                inputBox.replaceText(true);
                selectNode = null;
            }
            selectNode = selectedNode;
            inputBox.update();
            input.value = selectNode.getText();
            input.focus();
        },
        update() {
            if (selectNode) {
                let x = selectNode.getRenderBox().cx - selectNode.getRenderBox().width / 2;
                let y = selectNode.getRenderBox().cy - selectNode.getRenderBox().height / 2;
                let w = selectNode.getRenderBox().width - 5;

                let lines = input.value.split("\n");
                input.setAttribute("rows", lines.length);
                let h = lines.length * 14 + 3;
                if (h < 17) {
                    h = 17;
                }

                let yoffset = selectNode.getRenderBox().height / 2 - h / 2 - 2;
                yoffset = yoffset < 0 ? 0 : yoffset;

                for (const it of lines) {
                    let len = strLen(it);
                    if (w < len * 8 + 10) {
                        w = len * 8 + 10;
                    }
                }

                input.setAttribute("style", `top: ${y + yoffset}px; left: ${x}px; width: ${w}px; min-height: ${h}px; display: inline;`);
            }
        },
        isShow() {
            return selectNode != null;
        },
        hide() {
            inputBox.replaceText(true);
            selectNode = null;
            input.setAttribute("style", `top: 0px; left: 0px; display: none;`);
        },
        replaceText(ignoreHide) {
            if (selectNode) {
                kmNodeUpdateText(km, selectNode, input.value);
                input.value = "";
                if (!ignoreHide) {
                    inputBox.hide();
                }
            }
        }
    };
    input.onkeydown = e => {
        if (e.key == "Enter" && e.shiftKey) {
            input.value = input.value + "\n";
            inputBox.update();
            e.preventDefault();
            return;
        }
        if (e.key == "Enter") {
            inputBox.hide();
            e.preventDefault();
            return;
        }
    };
    input.oninput = (e) => {
        inputBox.update();
    };
    document.body.append(input);
    inputBox.hide();

    km.on("click", (e) => {
        let selectNodes = km.getSelectedNodes();
        if (selectNodes.length == 0) {
            inputBox.hide();
        }
    });
    km.on("mousemove", e => {
        inputBox.update();
    });
    km.on("touchmove", e => {
        inputBox.update();
    });
    km.on("dblclick", (e) => {
        console.log(e.kityEvent.targetShape.constructor.name);
        console.log(e.kityEvent.targetShape);
        if (e.kityEvent.targetShape.constructor.name == "Text" || e.kityEvent.targetShape.constructor.name == "Rect") {
            let selectNodes = km.getSelectedNodes();
            if (selectNodes.length > 0) {
                inputBox.show(selectNodes[0]);
            } else {
                inputBox.hide();
            }
        }

    });
    return inputBox;
}


/**
 * 添加复制内容到剪切板
 * @param {*} text 
 * @param {*} type
 */
function copyToClipboard(text, type) {
    let tmp = document.createElement("input");
    tmp.setAttribute("style", "opacity: 0;");
    tmp.value = text;
    tmp.oncopy = function (e) {
        const selection = document.getSelection();
        e.clipboardData.setData(type, selection.toString()); // 设置专属类容格式
        e.preventDefault();
    };
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand("copy", false);
    document.body.removeChild(tmp);
}

/**
 * 绑定快捷键
 * @returns 
 */
function windowHotKey() {
    let hotKeys = [];
    window.addEventListener("keydown", (e) => {
        for (const it of hotKeys) {
            let trigger = it.key[0] == e.key;
            for (const key of it.key) {
                if (key == "ctrl") {
                    trigger &= e.ctrlKey;
                }
                if (key == "alt") {
                    trigger &= e.altKey;
                }
                if (key == "shift") {
                    trigger &= e.shiftKey;
                }
            }
            if (trigger) {
                console.log("触发：", it.name);
                let ignorePrevent = it.func(e);
                if (ignorePrevent) {
                    continue;
                }
                e.preventDefault();
            }
        }
    });
    return {
        bind(name, ...key) {
            let item = {};
            item.name = name;
            item.key = key;
            hotKeys.push(item);
            return {
                /**
                 * @param {*} func 处理函数，返回true则不进行e.preventDefault();
                 */
                call(func) {
                    item.func = func;
                }
            };
        }
    };
}


/**
 * 字体选择器
 * @param  fonts 
 * @returns 
 */
function fontPicker(fonts) {
    let style = document.createElement("style");
    style.innerHTML = `
    @keyframes kity-minder-font-family-selector-pop-anim {
        0% {
            top: 10px;
            opacity: 0.6;
        }

        100% {
            top: 25px;
            opacity: 1;
        }
    }

    .kity-minder-font-family-selector {
        background-color: rgb(250, 250, 250);
        padding: 10px 0;
        font-size: 14px;
        border-radius: 8px;
        user-select: none;
        color: rgb(77, 77, 77);
        width: 200px;
        position: absolute;
        top: 25px; 
        left: 0px; 
        animation-name: kity-minder-font-family-selector-pop-anim;
        animation-duration: 0.5s;
        box-shadow: 2px 2px 10px 0px rgba(209, 210, 210, 0.718), -2px -2px 10px 0px rgba(209, 210, 210, 0.718);
    }

    .kity-minder-font-family-selector-item {
        padding: 5px 10px;
        border-radius: 2px;
        cursor: pointer;
        overflow-x: hidden;
    }

    .kity-minder-font-family-selector-item:hover {
        background-color: aliceblue;
    }      
    `;
    document.body.appendChild(style);

    let div = document.createElement("div");
    div.setAttribute("class", "kity-minder-font-family-selector");
    let targetCallback = null;
    let targetElement = null;
    let joinElements = [];

    let thiz = {
        show(target, callback) {
            targetElement = target;
            targetElement.appendChild(div);
            targetCallback = callback;
            div.setAttribute("style", "opacity: 1;");
        },
        close() {
            if (targetElement) {
                targetElement.removeChild(div);
            }
            targetElement = null;
            targetCallback = null;
            div.setAttribute("style", "opacity: 0;");
        },
        isShow() {
            return targetElement == null;
        },
        showTarget() {
            return targetElement;
        },
        join(element, callback) {
            joinElements.push(element);
            element.onclick = function (e) {
                if (thiz.showTarget() != e.target) {
                    thiz.show(e.target, (font) => {
                        callback(font);
                    });
                } else {
                    thiz.close();
                }
            };
        }
    };

    for (const it of fonts) {
        let item = document.createElement("div");
        item.setAttribute("class", "kity-minder-font-family-selector-item");
        item.setAttribute("style", `font-family: '${it}';`);
        item.innerText = it;
        item.onclick = (e) => {
            if (targetCallback) {
                targetCallback(it);
            }
            thiz.close();
            e.stopPropagation();
        };
        div.appendChild(item);
    }

    document.addEventListener("click", (e) => {
        if (e.target == div) {
            console.log("this div", div);
            return;
        }
        for (const it of joinElements) {
            if (it == e.target) {
                console.log("this div", it);
                return;
            }
        }
        thiz.close();
    });


    thiz.close();
    return thiz;
}

/**
 * 字体大小选择器
 * @param {*} sizes 
 * @returns 
 */
function fontSizePicker(sizes) {
    let style = document.createElement("style");
    style.innerHTML = `
    @keyframes kity-minder-font-size-selector-pop-anim {
        0% {
            top: 10px;
            opacity: 0.6;
        }

        100% {
            top: 25px;
            opacity: 1;
        }
    }

    .kity-minder-font-size-selector {
        background-color: rgb(250, 250, 250);
        padding: 10px 0;
        border-radius: 4px;
        user-select: none;
        color: rgb(77, 77, 77);
        width: 100px;
        position: absolute;
        top: 25px; 
        left: 0px; 
        animation-name: kity-minder-font-size-selector-pop-anim;
        animation-duration: 0.5s;
        box-shadow: 2px 2px 10px 0px rgba(209, 210, 210, 0.718), -2px -2px 10px 0px rgba(209, 210, 210, 0.718);
    }

    .kity-minder-font-size-selector-item {
        padding: 20px 10px;
        border-radius: 2px;
        cursor: pointer;

        position: absolute;
        top: 0px;
        left: 0px;
        opacity: 0;
    }

    .kity-minder-font-size-selector-item:hover {
        background-color: aliceblue;
    }     
    `;
    document.body.appendChild(style);

    let div = document.createElement("div");
    div.setAttribute("class", "kity-minder-font-size-selector");
    let targetCallback = null;
    let targetElement = null;
    let joinElements = [];

    let thiz = {
        show(target, callback) {
            targetElement = target;
            targetElement.appendChild(div);
            targetCallback = callback;
            div.setAttribute("style", "opacity: 1;");
        },
        close() {
            if (targetElement) {
                targetElement.removeChild(div);
            }
            targetElement = null;
            targetCallback = null;
            div.setAttribute("style", "opacity: 0;z-index:-999;");
        },
        isShow() {
            return targetElement == null;
        },
        showTarget() {
            return targetElement;
        },
        join(element, callback) {
            joinElements.push(element);
            element.onclick = function (e) {
                if (thiz.showTarget() != e.target) {
                    thiz.show(e.target, (font) => {
                        callback(font);
                    });
                } else {
                    thiz.close();
                }
            };
        }
    };

    for (const it of sizes) {
        let item = document.createElement("div");
        item.setAttribute("class", "kity-minder-font-family-selector-item");
        item.setAttribute("style", `font-size: ${it};`);
        item.innerText = it;
        item.onclick = (e) => {
            if (targetCallback) {
                targetCallback(it);
            }
            thiz.close();
            e.stopPropagation();
        };
        div.appendChild(item);
    }

    document.addEventListener("click", (e) => {
        if (e.target == div) {
            return;
        }
        for (const it of joinElements) {
            if (it == e.target) {
                return;
            }
        }
        thiz.close();
    });

    thiz.close();
    return thiz;
}

/**
 * 颜色选择器
 * @returns 
 */
function colorPicker() {
    let style = document.createElement("style");
    style.innerHTML = `
    @keyframes kity-minder-color-selector-pop-anim {
        0% {
            top: 10px;
        }

        100% {
            top: 25px;
        }
    }

    .kity-minder-color-selector {
        position: absolute;
        top: 25px; 
        left: 0px; 
        animation-name: kity-minder-color-selector-pop-anim;
        animation-duration: 0.5s;
        box-shadow: 2px 2px 10px 0px rgba(209, 210, 210, 0.718), -2px -2px 10px 0px rgba(209, 210, 210, 0.718);
        opacity: 0;
    }
    `;
    document.body.appendChild(style);


    let div = document.createElement("div");
    div.setAttribute("style", "opacity: 0;z-index:-999;");
    let selectColor = null;
    let targetElement = null;
    let joinElements = [];

    document.body.append(div);
    div.onclick = (e) => {
        e.stopPropagation();
    };

    let thiz = {};
    let colorSelector = ewColorPicker.createColorPicker({
        el: div,
        alpha: true,
        hue: true,
        hasBox: false,
        isClickOutside: false,
        hasClear: false,
        pickerAnimation: 'opacity',
        pickerAnimationTime: 0,
        sure: function (color) {
            if (selectColor) {
                selectColor(color);
            }
            thiz.close();
        },
        clear: function () {
            thiz.close();
        }
    });

    div.setAttribute("style", "display:none;");

    thiz = {
        show(target, callback) {
            div.setAttribute("class", "kity-minder-color-selector");
            targetElement = target;
            selectColor = callback;
            targetElement.appendChild(div);
            div.setAttribute("style", `opacity: 1;`);
            colorSelector.openPicker();
        },
        showTarget() {
            return targetElement;
        },
        close() {
            selectColor = null;
            targetElement = null;
            colorSelector.closePicker();
            if (targetElement) {
                targetElement.removeChild(div);
            }
            div.setAttribute("style", "display:none;");
        },
        join(element, callback) {
            joinElements.push(element);
            element.onclick = function (e) {
                if (thiz.showTarget() != e.target) {
                    thiz.show(e.target, (font) => {
                        callback(font);
                    });
                } else {
                    thiz.close();
                }
            };
        }
    };

    document.addEventListener("click", (e) => {
        if (e.target == div) {
            return;
        }
        for (const it of joinElements) {
            if (it == e.target) {
                return;
            }
        }
        thiz.close();
    });
    return thiz;
}


/**
 * 添加工具栏
 * @param {*} config 
 * @returns 
 */
function createToolbar(config) {
    let style = document.createElement("style");

    style.innerHTML = `
        @keyframes kity-minder-top-menu-pop-anim {
            0% {
                top: 10px;
                opacity: 0.5;
            }

            100% {
                top: 30px;
                opacity: 1;
            }
        }

        .kity-minder-top-menu-pop {
            position: absolute;
            width: 100%;
            top: 30px;
            display: flex;
            justify-content: center;
            animation-name: kity-minder-top-menu-pop-anim;
            animation-duration: 0.5s;
            z-index: 10;
        }

        .kity-minder-top-menu-container {
            display: inline-block;
        }

        .kity-minder-top-menu {
            background-color: rgb(232, 235, 236);
            padding: 12px;
            font-size: 10px;
            border-radius: 4px;
            display: inline-block;
            box-shadow: 2px 2px 10px 0px rgba(209, 210, 210, 0.718), -2px -2px 10px 0px rgba(209, 210, 210, 0.718);
            user-select: none;
            display: flex;
            align-items: center;
        }

        .kity-minder-top-menu .icon {
            display: inline-block;
            margin: 0 8px;
            color: rgb(83, 92, 105);
            position: relative;
            cursor: pointer;
        }

        .kity-minder-top-menu .icon:hover {
            color: rgb(6, 107, 201);
        }

        .kity-minder-top-menu .disable {
            color: rgba(177, 175, 175, 0.8);
        }

        .kity-minder-top-menu .disable:hover {
            color: rgba(177, 175, 175, 0.8);
        }

        .kity-minder-top-menu .split {
            margin: 0 15px;
        }

        .kity-minder-top-menu .tips {
            position: absolute;
            top: -25px;
            left: -40px;
            width: 100px;
            font-size: 12px;
            text-align: center;
            display: inline-block;
            font-weight: bold;
            color: rgb(129, 130, 132);
        }

        .kity-minder-use-style {
            color: rgb(22, 167, 46) !important;
        }    
    `;
    document.body.appendChild(style);
    let div = document.createElement("div");
    div.setAttribute("class", "kity-minder-top-menu-pop");
    let divContainer = document.createElement("div");
    divContainer.setAttribute("class", "kity-minder-top-menu-container");
    div.appendChild(divContainer);
    let divMenu = document.createElement("div");
    divMenu.setAttribute("class", "kity-minder-top-menu");
    divContainer.appendChild(divMenu);

    let thiz = {
        show() {
            for (const id in config.btns) {
                let it = config.btns[id];
                if (it.refresh) {
                    it.refresh(it); //刷新数据
                    it.btn.refresh(); // 刷新渲染
                }
            }
            if (div.parentElement != document.body) {
                document.body.appendChild(div);
            }
        },
        close() {
            if (div.parentElement == document.body) {
                document.body.removeChild(div);
            }
        }
    };
    for (const id in config.btns) {
        let it = config.btns[id];
        let btn = document.createElement("div");
        let tips = document.createElement("div");
        tips.setAttribute("class", "tips");
        btn.tips = tips;
        btn.addEventListener("mouseover", (e) => {
            tips.innerHTML = it.tips;
            btn.appendChild(tips);
        });
        document.body.addEventListener("mouseover", (e) => {
            if (e.target != tips && e.target != btn) {
                if (tips.parentElement == btn) {
                    btn.removeChild(tips);
                }
            }
        });
        btn.refresh = () => {
            if (typeof it.class == "string") {
                btn.setAttribute("class", "icon " + it.class);
            } else {
                btn.setAttribute("class", "icon " + it.class.join(" "));
            }
            btn.setAttribute("style", it.style);
            tips.innerHTML = it.tips;
        };
        btn.refresh();
        btn.onclick = (e) => {
            if (it.click) {
                it.click(e);
            }
            if (it.refresh) {
                it.refresh(it);
            }
            btn.refresh();
        };
        it.btn = btn;
        if (it.inited) {
            it.inited(it);
        }
        divMenu.append(btn);
    }

    return thiz;
}


function addToolbarFeature(km) {
    let colorSelector = colorPicker();
    let fontSelector = fontPicker(["微软雅黑", "Microsoft YaHei Mono", "楷体", "黑体", "等线", "仿宋", "宋体", "新宋体"]);
    let fontSizeSelector = fontSizePicker(['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px']);

    let toolbar = createToolbar({
        btns: {
            "image": {
                class: "kity-minder-icon-删除图片",
                tips: "删除图片",
                inited(it) {
                },
                refresh(it) {
                    let value = km.queryCommandValue('Image');
                    if (value && value.url) {
                        it.style = "";
                        it.class = "kity-minder-icon-删除图片";
                        it.tips = "删除图片";
                        it.click = (e) => {
                            km.execCommand("Image", "", value.title);
                        };
                    } else {
                        it.style = "display:none;";
                    }
                },
            },
            "note": {
                class: "kity-minder-icon-备注",
                tips: "备注",
                inited(it) {
                }
            },
            "link": {
                class: "kity-minder-icon-插入链接",
                tips: "插入链接",
                inited(it) {
                }
            },
            "spilt": {
                class: "kity-minder-icon-分割线",
                tips: "分割线",
                inited(it) {
                }
            },
            "stylecopy": {
                class: "kity-minder-icon-复制样式",
                tips: "复制样式",
                inited(it) {
                },
                refresh(it) {
                    if (it.styleCopyed) {
                        it.tips = "使用样式";
                        it.style = "color:rgb(153, 50, 249) !important;font-weight: bolder;";
                        it.click = (e) => {
                            km.execCommand('PasteStyle');
                            it.styleCopyed = false;
                        };
                    } else {
                        it.tips = "复制样式";
                        it.style = "";
                        it.click = (e) => {
                            km.execCommand('CopyStyle');
                            it.styleCopyed = true;
                        };
                    }
                }
            },
            "styleclear": {
                class: "kity-minder-icon-清除样式",
                tips: "清除样式",
                inited(it) {
                    it.click = (e) => {
                        km.execCommand("ClearStyle");
                    };
                },
                refresh(it) {

                }
            },
            "fontwight": {
                class: "kity-minder-icon-字体加粗",
                tips: "加粗",
                inited(it) {
                },
                refresh(it) {
                    let state = km.queryCommandState('Bold');
                    if (state == 1) {
                        it.tips = "取消加粗";
                        it.click = (e) => {
                            km.execCommand("Bold");
                        };
                    } else {
                        it.tips = "加粗";
                        it.click = (e) => {
                            km.execCommand("Bold");
                        };
                    }
                }
            },
            "fontitalic": {
                class: "kity-minder-icon-字体斜体",
                tips: "斜体",
                inited(it) {
                },
                refresh(it) {
                    let state = km.queryCommandState('Italic');
                    if (state == 1) {
                        it.tips = "取消斜体";
                        it.click = (e) => {
                            km.execCommand("Italic");
                        };
                    } else {
                        it.tips = "斜体";
                        it.click = (e) => {
                            km.execCommand("Italic");
                        };
                    }
                }
            },
            "fontfamily": {
                class: "kity-minder-icon-字体",
                tips: "字体",
                inited(it) {
                    fontSelector.join(it.btn, (family) => {
                        km.execCommand('FontFamily', family);
                    });
                }
            },
            "fontsize": {
                class: "kity-minder-icon-字号",
                tips: "字号",
                inited(it) {
                    fontSizeSelector.join(it.btn, (size) => {
                        km.execCommand('FontSize', size.substring(0, size.length - 2));
                    });
                }
            },
            "fontcolor": {
                class: "kity-minder-icon-字体颜色",
                tips: "字体颜色",
                inited(it) {
                    colorSelector.join(it.btn, (color) => {
                        km.execCommand('ForeColor', color);
                    });
                }
            },
            "fontbkg": {
                class: "kity-minder-icon-背景颜色",
                tips: "背景颜色",
                inited(it) {
                    colorSelector.join(it.btn, (color) => {
                        km.execCommand('Background', color);
                    });
                }
            },
        }
    });

    km.on("selectionchange", (e) => {
        let selects = km.getSelectedNodes();
        if (selects.length > 0) {
            toolbar.show();
        } else {
            toolbar.close();
        }
    });


    return toolbar;
}

/**
 * 添加撤销重做的功能
 * @param  km 
 */
function addRedoUndoFeature(km) {
    let history = [];
    let forword = [];
    let last = km.exportJson();
    let ignoreOnce = false;

    let thiz = {
        change() {
            if (ignoreOnce) {
                ignoreOnce = false;
                return;
            }
            let cur = km.exportJson();
            let diff = jsonpatch.compare(cur, last);
            if (diff.length > 0) {
                history.push(jsonpatch.compare(cur, last));
                history.splice(0, history.length - 100);
                last = cur;

                forword.splice(0, forword.length);
            }
        },
        undo() {
            if (history.length > 0) {
                let diff = history.pop();
                console.log("撤销", diff);
                ignoreOnce = true;
                km.applyPatches(diff);

                let cur = km.exportJson();
                forword.push(jsonpatch.compare(cur, last));
                forword.splice(0, forword.length - 100);
                last = cur;
            }
        },
        redo() {
            if (forword.length > 0) {
                let diff = forword.pop();
                console.log("重做", diff);
                ignoreOnce = true;
                km.applyPatches(diff);

                let cur = km.exportJson();
                history.push(jsonpatch.compare(cur, last));
                history.splice(0, history.length - 100);
                last = cur;
            }
        }
    };
    km.on("contentchange", (e) => {
        thiz.change();
    });
    return thiz;
}


function addBackgroundSelectorFeature(hotkey) {
    let style = document.createElement("style");
    style.innerHTML += `
    .minder-view-svg-background-0 { 
    }
    `;
    for (let i = 1; i < 10; i++) {
        style.innerHTML += `
        .minder-view-svg-background-${i} { 
            background: url("./resources/b${i}.jpg") no-repeat center fixed;
            background-size: cover;
            backdrop-filter: blur(10px);
        }
        `;
    }
    document.body.appendChild(style);

    let bkgAt = 0;
    let minderSvg = document.querySelector("#minder-view svg");

    let thiz = {
        use(at) {
            if (at > 9) {
                at = 9;
            }
            if (at < 0) {
                at = 0;
            }
            bkgAt = at;
            minderSvg.setAttribute("class", `minder-view-svg-background-${at}`);
            if(thiz.onchange){
                thiz.onchange(bkgAt);
            }
        },
        current() {
            return bkgAt;
        }
    };

    hotkey.bind("切换下一个背景", 'b', 'ctrl').call((e) => {
        if (bkgAt >= 9) {
            bkgAt = -1;
        }
        minderSvg.setAttribute("class", `minder-view-svg-background-${++bkgAt}`);
        if (thiz.onchange) {
            thiz.onchange(bkgAt);
        }
    });

    return thiz;
}