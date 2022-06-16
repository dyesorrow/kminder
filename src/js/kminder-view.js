var Kminder = function () {
    let filepath = null;
    let saveTodo = null;
    let loadTodo = null;

    let minderView = document.getElementById("minder-view");
    const km = window.km = new kityminder.Minder({
        renderTo: "#minder-view"
    });
    let theme = "fresh-green";
    document.title = "kminder";
    km.execCommand("theme", theme);
    km.execCommand('template', "right");

    // 复制替换文本或者节点paste
    window.addEventListener('paste', (e) => {
        for (const it of e.clipboardData.items) {
            console.log(it);
            if (it.kind == "file") {
                if (it.type.startsWith("image/")) {
                    let f = it.getAsFile();
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        km.execCommand("Image", reader.result, "");
                    };
                    reader.readAsDataURL(f);
                } else {
                    console.log("unkown file");
                }
            }
            if (it.kind == "string") {
                if (it.type == "text/plain") {
                    let selectNodes = km.getSelectedNodes();
                    if (selectNodes.length != 0) {
                        it.getAsString((text) => {
                            km.execCommand("AppendChildNode", text);
                        });
                    }
                }
                if (it.type == "this-minder") {
                    km.execCommand("Paste");
                }
                else {
                    it.getAsString((text) => {
                        console.log(text);
                    });
                }
            }
        }
    });

    /**
     * 添加功能支持
     */
    let inputBox = addEditFeature(km);
    let toolbar = addToolbarFeature(km);
    let history = addRedoUndoFeature(km);
    let hotkey = windowHotKey();
    let background = addBackgroundSelectorFeature(hotkey);
    background.use(9);


    let saveData = () => {
        if (saveTodo) {
            let data = km.exportJson();
            data.background = background.current();
            saveTodo(filepath, JSON.stringify(data));
        }
        document.title = "kminder - " + (filepath ? filepath : "");
    };

    /**
     * 添加快捷键绑定
     */
    hotkey.bind("新增节点", "Tab").call((e) => {
        if (km.getSelectedNodes().length > 0) {
            km.execCommand("AppendChildNode", "新节点");
        }
    });
    hotkey.bind("删除节点", "Delete").call((e) => {
        km.execCommand('RemoveNode');
    });
    hotkey.bind("向上移动节点", "ArrowUp", 'alt').call((e) => {
        km.execCommand('ArrangeUp');
    });
    hotkey.bind("向下移动节点", "ArrowDown", 'alt').call((e) => {
        km.execCommand('ArrangeDown');
    });
    hotkey.bind("重新布局", 'F', 'ctrl', 'shift').call((e) => {
        km.execCommand('ResetLayout');
    });
    hotkey.bind("保存", 's', 'ctrl').call((e) => {
        saveData();
    });
    hotkey.bind("撤销", 'z', 'ctrl').call((e) => {
        history.undo();
    });
    hotkey.bind("重做", 'y', 'ctrl').call((e) => {
        history.redo();
    });
    hotkey.bind("剪切节点", 'x', 'ctrl').call((e) => {
        let selectNodes = km.getSelectedNodes();
        if (selectNodes.length > 0) {
            if (!inputBox.isShow()) {
                copyToClipboard("true", "this-minder");
                km.execCommand("Cut");
                return false;
            }
            return true;
        }
    });
    hotkey.bind("复制节点", 'c', 'ctrl').call((e) => {
        let selectNodes = km.getSelectedNodes();
        if (selectNodes.length > 0) {
            if (!inputBox.isShow()) {
                copyToClipboard("true", "this-minder");
                km.execCommand("Copy");
                return false;
            }
            return true;
        }
    });

    let themes = Object.keys(kityminder.Minder.getThemeList());
    let themeAt = 0;
    for (const it of themes) {
        if (it == theme) {
            break;
        }
        themeAt++;
    }
    hotkey.bind("切换下一个主题", 'q', 'ctrl').call((e) => {
        if (themeAt >= themes.length) {
            themeAt = 0;
        }
        km.execCommand("theme", themes[++themeAt]);
    });

    hotkey.bind("切换上一个主题", 'Q', 'ctrl', 'shift').call((e) => {
        if (themeAt == 0) {
            themeAt = themes.length;
        }
        km.execCommand("theme", themes[--themeAt]);
    });



    /**
     * 文件拖拽进来
     */
    minderView.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
    minderView.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const path = files[0].path;
            if (loadTodo) {
                loadTodo(path);
            }
        }
    });

    km.on("contentchange", (e) => {
        document.title = "kminder - " + (filepath ? filepath : "") + " - " + "未保存";
    });

    let thiz = {
        load(path, text) {
            if (filepath) {
                // 保存旧内容
                saveData();
            }
            filepath = path;
            let save = JSON.parse(text);
            km.importJson(save.root);
            if (save.theme) {
                theme = save.theme;
                km.execCommand("theme", theme);
                km.execCommand('template', "right");
            }

            document.title = "kminder - " + path;
            if (save.background) {
                background.use(save.background);
            } else {
                background.use(0);
            }
        },
        updateFilePath(path) {
            filepath = path;
        },
        onsave(todo) {
            saveTodo = todo;
        },
        onload(todo) {
            loadTodo = todo;
        },
        ready() {
            if (loadTodo) {
                loadTodo();
            }
        }
    };
    return thiz;
}();