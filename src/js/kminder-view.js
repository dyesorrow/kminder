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

    /**
     * 添加功能支持
     */
    let inputBox = addEditFeature(km);
    let toolbar = addToolbarFeature(km);
    let history = addRedoUndoFeature(km);
    let hotkey = windowHotKey();
    let background = addBackgroundSelectorFeature();
    let themeSelector = addThemeSelectorFeature(km);
    let copyPaste = addCopyPasteFeature(km);

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
        return copyPaste.cutCurNode();
    });
    hotkey.bind("复制节点", 'c', 'ctrl').call((e) => {
        return copyPaste.copyCurNode();
    });
    hotkey.bind("切换下一个主题", 'q', 'ctrl').call((e) => {
        themeSelector.next();
    });
    hotkey.bind("切换上一个主题", 'Q', 'ctrl', 'shift').call((e) => {
        themeSelector.prev();
    });
    hotkey.bind("切换下一个背景", 'b', 'ctrl').call((e) => {
        background.next();
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
                themeSelector.use(theme);
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