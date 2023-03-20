import React, { useCallback, useEffect, useState } from "react";
import { ipcRenderer } from "electron";
import { vim } from "@replit/codemirror-vim";
import "react-cmdk/dist/cmdk.css";
import {
  GETDATE,
  EXTENSIONS,
  toDOCX,
  toPDF,
  format,
  toggleBetweenVimAndNormalMode,
  ValidateYaml,
} from "../lib/util";
import { effects } from "../lib/effects";
import { FileTree } from "../components/filetree";
import { getMarkdown } from "../lib/mdParser";
import fs from "fs-extra";
import mainPath from "path";
import { githubDark } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { getStatistics, ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView, highlightActiveLine } from "@codemirror/view";
import { usePrefersColorScheme } from "../lib/theme";
import { basicLight } from "cm6-theme-basic-light";
import { ListenToKeys } from "../lib/keyevents";
import { toast } from "react-hot-toast";
import { ButtomBar } from "../components/bottomBar";
import { CMDK } from "../components/cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "../components/nav";
import {
  MARKDOWNToggler,
  OPENSLIDERIcon,
  SEARCHIcon,
  SLIDERIcon,
  STACKIcon,
} from "../components/icons";

export function Leaflet() {
  type file = {
    path: string;
    name: string;
    body: string;
    structure: { [key: string]: any };
  };
  const date = new Date();
  const [value, setValue] = useState<string>("");
  const [insert, setInsert] = useState<boolean>(false);
  const [files, setFiles] = useState<file[]>([]);
  const [name, setName] = useState<string>("");
  const [scroll, setScroll] = useState<number>(0);
  const [path, setPath] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<"root" | "projects">("root");
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [click, setClick] = useState<boolean>(false);
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [fileNameBox, setFileNameBox] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [pandocAvailable, setPandocAvailable] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string>("1L:1C");
  const appDir = mainPath.resolve(require("os").homedir(), "leaflet");
  const [struct, setStruct] = useState<{ [key: string]: any }>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [parentDir, setParentDir] = useState<string>(appDir);
  const [editorview, setEditorView] = useState<EditorView>();
  const [isVim, setIsVim] = useState<boolean>(false);
  const [open, setOpen] = React.useState(true);
  const refs = React.useRef<ReactCodeMirrorRef>({});
  const prefersColorScheme = usePrefersColorScheme();
  const isDarkMode = prefersColorScheme === "dark";
  const resolvedMarkdown = getMarkdown(value);
  useEffect(() => {
    ListenToKeys(
      saveFile,
      editorview,
      insert,
      setInsert,
      toPDF,
      toDOCX,
      value,
      name,
      path,
      fileDialog,
      setFileNameBox,
      setSearch,
      setClick,
      click,
      open ? handleDrawerClose : handleDrawerOpen
    );
  });

  const handleDrawerOpen = () => {
    setOpen(true);
  };
  const handleDrawerClose = () => {
    setOpen(false);
  };

  const saveFile = () => {
    try {
      let newvalue = value;
      try {
        newvalue = format(value);
      } catch (e) {
        console.log(e);
      }

      ipcRenderer.invoke("saveFile", path, newvalue).then(() => {
        setTimeout(() => {
          setIsEdited(false);
        }, 3000);
      });
    } catch (e) {
      console.log(e);
    }
  };

  const fileDialog = () => {
    ipcRenderer.invoke("app:on-fs-dialog-open").then(() => {
      ipcRenderer.invoke("getTheFile").then((files = []) => {
        setFiles(files);
        Update();
      });
    });
  };

  /**
   * @description delete a file node
   * @param {string} path - path of the file to be deleted
   * @param {string} name - name of the file to be deleted
   * @returns {void}
   */
  function onDelete(path: string, name: string): void {
    try {
      if (!fs.existsSync(path)) {
        return;
      }
      ipcRenderer.invoke("deleteFile", name, path).then(() => {
        Update();
        toast("File moved to trash", {
          icon: "🗑️",
          style: {
            backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
            color: isDarkMode ? "#fff" : "#000",
          },
        });

        setStruct(files[0].structure.children);
        const index = Math.floor(Math.random() * files.length);
        setInsert(false);
        setValue(files[index].body);
        setName(files[index].name);
        setPath(files[index].path);
      });
    } catch (e) {
      console.log(e);
    }
  }

  const Update = () => {
    ipcRenderer.invoke("getTheFile").then((files = []) => {
      setFiles(files);
      setStruct(files[0].structure.children);
    });
  };

  effects(
    false,
    setPandocAvailable,
    setIsVim,
    setFiles,
    setValue,
    setName,
    setPath,
    refs,
    setEditorView,
    files,
    setStruct,
    path,
    name,
    value,
    saveFile,
    Update,
    onDelete,
    setInsert,
    insert,
    fileDialog,
    setScroll
  );

  const updateCursor = (a, b) => {
    const line = a.number;
    const column = b - a.from;
    setCursor(`${line}L:${column}C`);
  };

  const checkEdit = (doc) => {
    if (!path) return;
    doc.toString() === fs.readFileSync(path, "utf8")
      ? setIsEdited(false)
      : () => {};
    setIsEdited(true);
  };

  /**
   * @description updates cm state on change
   */
  const onChange = useCallback(
    (doc, viewUpdate) => {
      setValue(doc.toString());
      let offset = getStatistics(viewUpdate).selection.main.head;
      let line = viewUpdate.state.doc.lineAt(offset);
      updateCursor(line, offset);
      if (line.number === viewUpdate.state.doc.length) {
        viewUpdate.state.doc.lineAt(offset).to = offset;
        viewUpdate.state.scrollIntoView = true;
      }

      checkEdit(doc);
    },
    [path]
  );

  /**
   * @description creates a new directory with a single file
   * @param {string} name - name of the directory
   */
  const createNewDir = (name: string) => {
    if (fs.existsSync(mainPath.join(parentDir, name)) || name === "") {
      return;
    }
    if (fs.existsSync(parentDir)) {
      fs.mkdirSync(`${parentDir}/${name}`);
      fs.writeFileSync(
        `${parentDir}/${name}/new.md`,
        `${name} created on ${GETDATE()} at ${date.toLocaleTimeString()}`
      );
      Update();
    }
    setIsCreatingFolder(false);
  };

  useEffect(() => {
    ipcRenderer.on("open", function () {
      fileDialog();
    });
  }, []);

  function CommandMenu() {
    return (
      click && (
        <CMDK
          value={value}
          onNewFile={() => {
            setFileNameBox(true);
          }}
          onCreatingFolder={() => {
            try {
              setIsCreatingFolder(true);
              setFileNameBox(true);
            } catch (e) {
              console.log(e);
            }
          }}
          setSearch={setSearch}
          files={files}
          pandocAvailable={pandocAvailable}
          setClick={setClick}
          page={page}
          search={search}
          onDocxConversion={(value: string, name: string) =>
            toDOCX(value, name)
          }
          onPdfConversion={(value: string, name: string) => toPDF(value, name)}
          menuOpen={menuOpen}
          onFileSelect={(file) => {
            try {
              onNodeClicked(file.path, file.name);
            } catch (err) {
              console.log(err);
            }
          }}
          name={name}
        />
      )
    );
  }
  useEffect(() => {
    ipcRenderer.on("new", function () {
      setFileNameBox(true);
    });
  }, [fileNameBox]);

  /**
   * @description handle file selection from the sidebar
   * @param {string} path - path of the file to be selected
   * @param {string} name - name of the file to be selected
   * @returns {void}
   */
  const onNodeClicked = (path: string, name: string): void => {
    try {
      saveFile();
      setValue(fs.readFileSync(path, "utf8"));
      setName(name);
      setPath(path);
      localStorage.setItem("currPath", path);
      setInsert(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="h-screen w-screen" style={{ overflow: "hidden" }}>
      <div className="flex" style={{ minHeight: "100vh" }}>
        <div className="hidden md:flex md:flex-row">
          <div className="h-screen-fix no-scrollbar flex overflow-y-scroll bg-palette-0 bg-black"></div>
          <Nav
            open={open}
            handleDrawerOpen={handleDrawerOpen}
            handleDrawerClose={handleDrawerClose}
            setClick={() => setClick(!click)}
            click={click}
          />
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                animate={{ width: 220 }}
                initial={{ width: 0 }}
                exit={{ width: 0 }}
                className="second-nav custom-border no-scrollbar z-30 flex grow flex-col overflow-y-scroll border-r-[0.5px] bg-transparent"
              >
                <div className="drag flex shrink-0 flex-col justify-center px-4 h-16">
                  <div className="flex items-center justify-between">
                    <span className="w-full text-lg font-small text-palette-800">
                      Notes
                    </span>
                    <span
                      onClick={() => {
                        setOpen(false);
                      }}
                      className="flex h-[22px] items-center transition-all duration-300 smarthover:hover:text-primary-500 text-palette-600"
                    >
                      <SLIDERIcon />
                    </span>
                  </div>
                </div>
                <div className="no-scrollbar mx-2.5 space-y-5 overflow-y-auto pb-32">
                  <div>
                    <ul className="space-y-1">
                      <li>
                        <span
                          className="cursor-pointer flex w-full items-center space-x-2.5 rounded-xl px-2.5 py-2.5 transition-all duration-300 smarthover:hover:text-primary-500 bg-palette-100 text-primary-500 dark:bg-palette-50"
                          onClick={() => setClick(!click)}
                          aria-current="page"
                        >
                          <SEARCHIcon />
                          <span className="align-middle font-mono text-sm">
                            search
                          </span>
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <div className="sticky top-0 bg-palette-0 pb-2"></div>
                    <ul className="space-y-1">
                      <li className="overflow-y-scroll">
                        <FileTree
                          structures={struct}
                          onNodeClicked={(path, name) =>
                            onNodeClicked(path, name)
                          }
                          path={path}
                        />
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div
          className="flex grow flex-col overflow-hidden transition-all duration-150"
          style={{ willChange: "transform" }}
        >
          <div
            id="dashboard-view-container"
            className="relative flex grow flex-col overflow-y-auto"
            data-projection-id={11}
            style={{ transform: "none", opacity: 1 }}
          >
            <div className="absolute inset-x-0 top-0 z-100">
              <div className="topbar drag fixed top-0 z-100 mx-auto flex w-full flex-col bg-palette-0">
                <div className="custom-border flex h-14 shrink-0 border-b-[0.5px] bg-transparent md:px-4 md:h-16">
                  <button
                    type="button"
                    className="custom-border pl-4 text-palette-900 focus:outline-none md:hidden"
                  >
                    <span className="sr-only">Open sidebar</span>

                    <OPENSLIDERIcon />
                  </button>
                  <div className="flex flex-1 items-center justify-between px-4 md:px-0">
                    <div className="flex w-full items-center">
                      <span className="w-full text-lg font-medium lowercase text-palette-800">
                        <AnimatePresence>
                          <motion.div
                            key={path}
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {name.endsWith(".md") ? name.slice(0, -3) : name}
                          </motion.div>
                        </AnimatePresence>
                      </span>
                      <div className="flex justify-end space-x-5">
                        <button
                          className="focus:outline-none"
                          onClick={(e) => {
                            setInsert(!insert);
                          }}
                        >
                          <div className="h-[22px] font-medium text-palette-900 transition-all duration-300 active:text-palette-500 smarthover:hover:text-palette-500">
                            <MARKDOWNToggler />
                          </div>
                        </button>
                        <button
                          className="focus:outline-none"
                          onClick={(e) => {
                            e.preventDefault();
                            ipcRenderer.send("show-context-menu", isVim);
                          }}
                        >
                          <STACKIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="no-scrollbar grow pt-[3.5rem] md:pt-[4rem]">
              <div className="virtual-list h-full">
                <div
                  className="
                flex h-[calc(100vh-170px)] w-full flex-col 
                "
                >
                  {insert ? (
                    <div
                      className="markdown-content"
                      style={{ padding: "40px", zIndex: "-1" }}
                    >
                      <div>
                        <CodeMirror
                          ref={refs}
                          value={value}
                          height="100%"
                          width="100%"
                          autoFocus={true}
                          theme={isDarkMode ? githubDark : basicLight}
                          basicSetup={false}
                          extensions={
                            isVim ? [vim(), ...EXTENSIONS] : EXTENSIONS
                          }
                          onChange={onChange}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <AnimatePresence>
                        <motion.div
                          key={path}
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: 0.2 }}
                          style={{ paddingTop: "1em" }}
                        >
                          <div id="content" style={{ padding: "40px" }}>
                            {ValidateYaml(resolvedMarkdown.metadata)}
                            <div>
                              <div
                                id="previewArea"
                                style={{
                                  marginBottom: "5em",
                                }}
                                dangerouslySetInnerHTML={
                                  resolvedMarkdown.document
                                }
                              />
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                      {ButtomBar(
                        insert,
                        () => toggleBetweenVimAndNormalMode(setIsVim),
                        isVim,
                        value,
                        cursor,
                        scroll,
                        editorview,
                        open
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CommandMenu />
    </div>
  );
}
