import React, { useCallback, useEffect, useRef, useState } from "react";
import { ipcRenderer, shell } from "electron";
import { undo } from "@codemirror/commands";
import "react-cmdk/dist/cmdk.css";
import {
  deleteFile,
  GETDATE,
  LINK,
  BOLD,
  QUICKINSERT,
  ADDYAML,
} from "../lib/util";
import Todo from "../components/todo";
import { FileTree } from "../components/filetree";

import {
  CALENDARIcon,
  COLLAPSEIcon,
  NEWFOLDERIcon,
  EXPANDIcon,
  NEWNOTEIcon,
} from "../components/icons";
import { METADATE, METATAGS, METAMATERIAL } from "../components/metadata";
import { progress } from "../components/progress";
import { getMarkdown } from "../lib/mdParser";
import commandExists from "command-exists";
import { SYNONYMS } from "../lib/synonyms";
import fs from "fs-extra";
import dragDrop from "drag-drop";
import Head from "next/head";
import pandoc from "node-pandoc";
import mainPath from "path";
import open from "open";
import os from "os";
import { CMDK } from "../components/cmdk";
import { languages } from "@codemirror/language-data";
import { githubDark } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { getStatistics, ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { codeFolding, foldGutter, indentOnInput } from "@codemirror/language";
import { usePrefersColorScheme } from "../lib/theme";
import { xcodeLight } from "@uiw/codemirror-theme-xcode";
import { EditorSelection } from "@codemirror/state";

export default function Next() {
  type file = {
    path: string;
    name: string;
    body: string;
    structure: { [key: string]: any };
  };
  const [isViewingTodo, setViewingTodo] = useState(false);
  const [value, setValue] = useState<string>("");
  const [insert, setInsert] = useState<boolean>(false);
  const [files, setFiles] = useState<file[]>([]);
  const [scroll, setScroll] = useState<number>(0);
  const [name, setName] = useState<string>("");
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
  const [thesaurus, setThesaurus] = useState<string[]>([]);
  const [displayThesaurus, setDisplayThesaurus] = useState<boolean>(false);
  const [clockState, setClockState] = useState<string>();
  const [whichIsActive, setWhichIsActive] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [finder, toogleFinder] = useState<boolean>(false);
  const [found, setFound] = useState<boolean>(true);
  const [saver, setSaver] = useState<string>("");
  const [wordToFind, setWordToFind] = useState<string>("");
  const appDir = mainPath.resolve(os.homedir(), "leaflet");
  const [struct, setStruct] = useState<{ [key: string]: any }>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [parentDir, setParentDir] = useState<string>(appDir);
  const Desktop = require("os").homedir() + "/Desktop";
  const [detailIsOpen, setDetailIsOpen] = useState<boolean>(false);
  const [editorview, setEditorView] = useState<EditorView>();
  const ref = useRef<HTMLTextAreaElement>(null);
  const refs = React.useRef<ReactCodeMirrorRef>({});
  let synonyms = {};
  const prefersColorScheme = usePrefersColorScheme();
  const isDarkMode = prefersColorScheme === "dark";
  const onboardingDIR = mainPath.resolve(
    os.homedir(),
    "leaflet",
    "onboarding.md"
  );

  useEffect(() => {
    openExternalInDefaultBrowser();
    checkForPandoc();
    ipcRenderer.invoke("getTheFile").then((files = []) => {
      setFiles(files);
      setValue(files[0] ? `${files[0].body}` : "");
      setName(files[0] ? `${files[0].name}` : "");
      setPath(files[0] ? `${files[0].path}` : "");
    });
  }, []);

  // useEffect(() => {
  //   let clock = setInterval(() => {
  //     const date = new Date();
  //     setClockState(date.toLocaleTimeString());
  //   }, 1000);
  //   return () => {
  //     clearInterval(clock);
  //   }
  // }, []);

  useEffect(() => {
    if (refs.current?.view) setEditorView(refs.current?.view);
  }, [refs.current]);

  useEffect(() => {
    if (files.length > 0) {
      setStruct(files[0].structure.children);
    }
  }, [files]);

  const handleScroll = () => {
    let ScrollPercent = 0;
    const Scrolled = document.documentElement.scrollTop;
    const MaxHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    ScrollPercent = (Scrolled / MaxHeight) * 100;
    setScroll(ScrollPercent);
  };
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const updateCursor = (a, b) => {
    const line = a.number;
    const column = b - a.from;
    setCursor(`${line}L:${column}C`);
  };

  const checkEdit = (doc) => {
    if (!path) return;
    doc.toString() === fs.readFileSync(path, "utf8")
      ? setIsEdited(false)
      : setSaver("EDITED");
    setIsEdited(true);
  };

  const onChange = useCallback(
    (doc, viewUpdate) => {
      setValue(doc.toString());
      let offset = getStatistics(viewUpdate).selection.main.head;
      let line = viewUpdate.state.doc.lineAt(offset);
      updateCursor(line, offset);
      checkEdit(doc);
    },
    [path]
  );
  const createNewDir = (name: string) => {
    if (fs.existsSync(mainPath.join(parentDir, name)) || name === "") {
      return;
    }
    if (fs.existsSync(parentDir)) {
      fs.mkdirSync(`${parentDir}/${name}`);
      fs.writeFileSync(
        `${parentDir}/${name}/new.md`,
        `${name} created on ${GETDATE()} at ${clockState}`
      );
      Update();
    }
    setIsCreatingFolder(false);
  };

  const checkForPandoc = () => {
    commandExists("pandoc", (err, exists) => {
      if (err) {
        console.log(err);
      }
      if (exists) {
        setPandocAvailable(true);
      }
    });
  };

  const getSynonyms = () => {
    const answer: string[] = new Array();
    let response = find_synonym(activeWord());
    if (!response) {
      return;
    }

    for (let i = 0; i < response.length; i++) {
      answer.push(response[i]);
    }
    setThesaurus(answer);
    setDisplayThesaurus(true);
  };

  const find_synonym = (str: string) => {
    if (str.trim().length < 4) {
      return;
    }

    const target = str.toLowerCase();
    synonyms = SYNONYMS;

    if (synonyms[target]) {
      console.log(typeof synonyms[target]);
      return uniq(synonyms[target]);
    }

    if (target[target.length - 1] === "s") {
      const singular = synonyms[target.substr(0, target.length - 1)];
      if (synonyms[singular]) {
        return uniq(synonyms[singular]);
      }
    }
  };

  const activeWord = () => {
    const area = ref.current;
    const l = activeWordLocation();
    return area?.value.substr(l.from, l.to - l.from);
  };

  function uniq(a1: string[]) {
    var a2: string[] = new Array();
    for (const id in a1) {
      if (a2.indexOf(a1[id]) === -1) {
        a2[a2.length] = a1[id];
      }
    }
    return a2;
  }

  const activeWordLocation = () => {
    const area = ref.current;
    const position = area!.selectionStart;
    var from = position - 1;

    // Find beginning of word
    while (from > -1) {
      const char = area?.value[from];
      if (!char || !char.match(/[a-z]/i)) {
        break;
      }
      from -= 1;
    }

    // Find end of word
    let to = from + 1;
    while (to < from + 30) {
      const char = area?.value[to];
      if (!char || !char.match(/[a-z]/i)) {
        break;
      }
      to += 1;
    }

    from += 1;
    return { from: from, to: to, word: area?.value.substring(from, to) };
  };

  const replaceActiveWord = (word) => {
    try {
      if (!word) {
        return;
      }

      const area = ref.current;

      const l = activeWordLocation();
      const w = area?.value.substr(l.from, l.to - l.from);

      if (w?.substr(0, 1) === w?.substr(0, 1)?.toUpperCase()) {
        word = word.substr(0, 1).toUpperCase() + word.substr(1, word.length);
      }
      area?.setSelectionRange(l.from, l.to);
      document.execCommand("insertText", false, word);
      area?.focus();
    } catch (e) {
      console.log(e);
    }
  };

  const nextSynonym = () => {
    setWhichIsActive(0);
    const element = document.getElementById("thesaurusWords");
    var previousWord = element!.children[whichIsActive] as HTMLElement;
    setWhichIsActive((whichIsActive + 1) % thesaurus.length);
    setCount(count + 1);
    const currentWord = element?.children[whichIsActive];
    if (previousWord) {
      previousWord.style.display = "none";
    }
    if (currentWord) {
      currentWord.classList.add("active");
      currentWord.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  function find(word: string) {
    if (word.trim().length < 4) {
      toogleFinder(false);
      setFound(true);
      setWordToFind("");
      return;
    }

    const area = ref.current;
    const startPos = area?.value.toLowerCase().indexOf(word) as number | null;
    const endPos = startPos + word.length;

    if (typeof area?.selectionStart != "undefined") {
      area?.focus();
      if (startPos !== -1) {
        scrollAnimate(area, endPos - 100, 200);
        area.setSelectionRange(startPos, endPos);
        toogleFinder(false);
      } else {
        area.setSelectionRange(area.selectionStart, area.selectionStart);
        setFound(false);
        setTimeout(() => {
          toogleFinder(false);
          setFound(true);
          setWordToFind("");
        }, 2000);
      }
      return startPos;
    }
    return startPos;
  }

  function scrollAnimate(element: HTMLElement, to: number, duration: number) {
    const start = element.scrollTop;
    const change = to - start;
    let currentTime = 0;
    const increment = 20;
    const animate = function () {
      currentTime += increment;
      const val = easeInOutQuad(currentTime, start, change, duration);
      element.scrollTop = val;
      if (currentTime < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  function easeInOutQuad(t: number, b: number, c: number, d: number) {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  }

  const openExternalInDefaultBrowser = () => {
    document.addEventListener("click", (event) => {
      const element = event.target as HTMLAnchorElement | null;
      if (
        element?.tagName === "A" &&
        element?.href.indexOf(window.location.href) > -1 === false
      ) {
        event.preventDefault();
        open(element?.href);
      }
    });
  };

  const Update = () => {
    ipcRenderer.invoke("getTheFile").then((files = []) => {
      setFiles(files);
      setStruct(files[0].structure.children);
    });
  };
  const convertToPDF = () => {
    try {
      const path = `${Desktop}/${name.replace(/\.md$/, "")}.pdf`;
      pandoc(value, `-f markdown -t pdf -o ${path}`, function (err, result) {
        if (err) console.log(err);
        if (fs.existsSync(path)) {
          open(path);
        }
      });
    } catch (e) {
      console.log(e);
    }
  };

  const converToDocx = () => {
    try {
      const path = `${Desktop}/${name.replace(/\.md$/, "")}.docx`;
      pandoc(value, `-f markdown -t docx -o ${path}`, function (err, result) {
        if (err) console.log(err);
        if (fs.existsSync(path)) {
          open(path);
        }
      });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    ipcRenderer.on("save", function () {
      saveFile();
      Update();
    });
  }, [value, path]);

  useEffect(() => {
    ipcRenderer.on("insertClicked", function () {
      insert ? "" : setInsert(true);
    });

    ipcRenderer.on("previewClicked", function () {
      insert ? setInsert(false) : "";
    });
  }, [insert]);

  useEffect(() => {
    ipcRenderer.on("open", function () {
      openWindow();
    });
  }, []);

  useEffect(() => {
    ipcRenderer.on("new", function () {
      setFileNameBox(true);
    });
  }, [fileNameBox]);

  const docxToMd = (filePath) => {
    let destination = `${appDir}/${filePath.name.split(".")[0]}.md`;
    destination = destination.replace(/\s/g, "");
    try {
      pandoc(
        filePath.path,
        `-f docx -t markdown -o ${destination}`,
        function (err, result) {
          if (err) console.log(err);
          if (fs.existsSync(destination)) {
            Update();
          }
        }
      );
    } catch (e) {
      console.log(e);
    }

    return destination;
  };

  useEffect(() => {
    dragDrop("body", (files) => {
      const checkIndexNameValue = files[files.length - 1].name;
      console.log(checkIndexNameValue);
      const _files = files.map((file) => {
        let fileName = file.name;
        console.log("maddddd", fileName);
        let filePath = file.path;
        const extension = file.path.split(".").pop();
        if (extension != "md" && extension === "docx") {
          const docx = docxToMd(file);
          fileName = mainPath.parse(docx).base;
          filePath = docx;
        }
        return {
          name: fileName,
          path: filePath,
        };
      });

      ipcRenderer.invoke("app:on-file-add", _files).then(() => {
        ipcRenderer.invoke("getTheFile").then((files = []) => {
          setFiles(files);
          setInsert(false);
          // set the value to currently added file
          const index = files.findIndex(
            (file) => file.name === checkIndexNameValue.split(".")[0]
          );
          index !== -1
            ? () => {
                setValue(files[index].body);
                setName(files[index].name);
                setPath(files[index].path);
              }
            : () => {
                setValue(files[0].body);
                setName(files[0].name);
                setPath(files[0].path);
              };
          Update();
        });
      });
    });
  }, []);

  const commentOut = () => {
    if (!insert || !editorview) return;
    const main = editorview.state.selection.main;
    const txt = editorview.state.sliceDoc(
      editorview.state.selection.main.from,
      editorview.state.selection.main.to
    );
    if (txt.length === 0) return;
    if (txt.startsWith("<!--") && txt.endsWith("-->")) {
      const newText = txt.slice(4, -3);
      editorview.dispatch({
        changes: {
          from: main.from,
          to: main.to,
          insert: newText,
        },
        selection: EditorSelection.cursor(main.from + newText.length),
      });
    } else {
      const comment = `<!-- ${txt} -->`;
      editorview.dispatch({
        changes: {
          from: main.from,
          to: main.to,
          insert: comment,
        },
        selection: EditorSelection.cursor(main.from + comment.length),
      });
    }
  };

  const onDelete = (path, name) => {
    try {
      if (!fs.existsSync(path)) {
        return;
      }
      ipcRenderer.invoke("deleteFile", name, path).then(() => {
        Update();
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
  };

  const createNewFile = () => {
    fileName != ""
      ? ipcRenderer
          .invoke("createNewFile", parentDir, fileName.replace(/\.md$/, ""))
          .then(() => {
            setFiles(files);
            Update();
          })
      : null;
  };

  const saveFile = () => {
    try {
      setSaver("SAVING...");
      ipcRenderer.invoke("saveFile", path, value).then(() => {
        Update();
        setSaver("SAVED");
        setTimeout(() => {
          setIsEdited(false);
          setSaver("EDITED");
        }, 3000);
      });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    document.onkeydown = function ListenToKeys(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        saveFile();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        if (!insert) {
          return;
        }
        BOLD(editorview);
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        convertToPDF();
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        converToDocx();
        e.preventDefault();
        return;
      }

      // if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      //   if (!insert) {
      //     return;
      //   }
      //   toogleFinder(true);
      //   document.getElementById("finderInput")?.focus();
      //   e.preventDefault();
      //   return;
      // }

      if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
        if (path != onboardingDIR) {
          setInsert(true);
          e.preventDefault();
          return;
        } else {
          setInsert(false);
          e.preventDefault();
          return;
        }
      } else if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
        setInsert(false);
        e.preventDefault();
        return;
      }

      if (e.key === "o" && (e.ctrlKey || e.metaKey)) {
        openWindow();
        e.preventDefault();
        return;
      }

      if ((e.key === "[" || e.key === "]") && (e.ctrlKey || e.metaKey)) {
        if (!insert) {
          return;
        }
        LINK(editorview);
      }

      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        setFileNameBox(true);
        e.preventDefault();
        return;
      }

      // I need new key for this
      if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        if (!insert) {
          return;
        }
        QUICKINSERT(editorview, GETDATE());
        e.preventDefault();
        return;
      }
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        if (!insert) {
          return;
        }
        commentOut();
        e.preventDefault();
        return;
      }

      // if (
      //   (e.key === "Backspace" || e.key === "Delete") &&
      //   (e.ctrlKey || e.metaKey)
      // ) {
      //   onDelete();
      //   e.preventDefault();
      //   return;
      // }

      if (e.key === "t" && (e.ctrlKey || e.metaKey)) {
        if (!insert) {
          return;
        }
        QUICKINSERT(editorview, clockState);
        e.preventDefault();
        return;
      }
      if (e.key === "j" && (e.ctrlKey || e.metaKey)) {
        if (!insert) {
          return;
        }
        ADDYAML(editorview);
        e.preventDefault();
        return;
      }
      if (e.metaKey && e.key === "z") {
        if (!insert || !editorview) return;
        undo(editorview);
      }

      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        setSearch("");
        setClick(!click);
        return;
      } else if (e.key === "Escape") {
        setClick(false);
        return;
      }
      if (e.key === "Tab") {
        if (!insert) {
          e.preventDefault();
          return;
        }
      }
      if (displayThesaurus) {
        if (e.key === "Tab") {
          if (e.shiftKey) {
            nextSynonym();
            replaceActiveWord(thesaurus[whichIsActive]);
            e.preventDefault();
            return;
          } else {
            replaceActiveWord(thesaurus[0]);
            setTimeout(() => {
              setDisplayThesaurus(false);
            }, 100);
            saveFile();
            e.preventDefault();
            return;
          }
        }
      }
    };
  });

  const creatingFileOrFolder = () => {
    if (fileName.length < 1) {
      setFileNameBox(false);
      return;
    }
    isCreatingFolder ? createNewDir(fileName) : createNewFile();
    setFileNameBox(false);
    setTimeout(() => {
      setFileName("");
    }, 100);
  };

  const openWindow = () => {
    ipcRenderer.invoke("app:on-fs-dialog-open").then(() => {
      ipcRenderer.invoke("getTheFile").then((files = []) => {
        setFiles(files);
        Update();
      });
    });
  };

  const checkObject = (obj) => {
    return typeof obj === "object" && obj !== null;
  };

  const onFileTreeClick = (path: string, name: string) => {
    try {
      setParentDir(mainPath.dirname(path));
      saveFile();
      setValue(fs.readFileSync(path, "utf8"));
      setName(name);
      setPath(path);
      setViewingTodo(false);
      setInsert(false);

      document.documentElement.scrollTop = 0;
    } catch (err) {
      console.log(err);
    }
  };

  const addOpenToAllDetailTags = () => {
    const searchArea = document.getElementById(
      "fileTree"
    ) as HTMLDivElement | null;
    const allDetailTags = searchArea.getElementsByTagName("details");
    if (!detailIsOpen) {
      if (searchArea) {
        for (let i = 0; i < allDetailTags.length; i++) {
          allDetailTags[i].setAttribute("open", "");
        }
        setDetailIsOpen(true);
      }
    } else {
      if (searchArea) {
        for (let i = 0; i < allDetailTags.length; i++) {
          allDetailTags[i].removeAttribute("open");
        }
        setDetailIsOpen(false);
      }
    }
  };

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css"
          integrity="sha384-AfEj0r4/OFrOo5t7NnNe46zW/tFgW6x/bCJG8FqQCEo3+Aro6EYUG4+cU+KJWu/X"
          crossOrigin="anonymous"
        />

        <script
          defer
          src="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.js"
          integrity="sha384-g7c+Jr9ZivxKLnZTDUhnkOnsh30B4H0rpLUpJ4jAIKs4fnJI+sEnkvrMWph2EDg4"
          crossOrigin="anonymous"
        ></script>
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/contrib/auto-render.min.js"
          integrity="sha384-mll67QQFJfxn0IYznZYonOWZ644AWYC+Pt2cHqMaRhXVrursRwvLnLaebdGIlYNa"
          crossOrigin="anonymous"
        ></script>
      </Head>
      <div className="mainer" style={{ minHeight: "100vh" }}>
        <div>
          <div
            className="fs fixed"
            style={{ width: "17.5em", maxWidth: "18.5em", minHeight: "100vh" }}
          >
            <div>
              <div
                style={{
                  height: "100vh",
                  marginTop: "5vh",
                  paddingTop: "2em",
                }}
              >
                <div
                  className="flex"
                  style={{
                    marginBottom: "5vh",
                    marginLeft: "auto",
                    marginRight: "auto",
                    width: "100%",
                    maxWidth: "17.5em",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => {
                      setFileNameBox(true);
                    }}
                    style={{ marginRight: "1em", cursor: "default" }}
                    className="items-center"
                  >
                    <div>
                      <NEWNOTEIcon />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        setIsCreatingFolder(true);
                        setFileNameBox(true);
                      } catch (e) {
                        console.log(e);
                      }
                    }}
                    style={{
                      marginRight: "1em",
                      cursor: "default",
                      outline: "none",
                    }}
                    className="items-center"
                  >
                    <div>
                      <NEWFOLDERIcon />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setViewingTodo(true);
                    }}
                    style={{
                      outline: "none",
                      marginRight: "1em",
                      cursor: "default",
                    }}
                    className="items-center"
                  >
                    <div>
                      <CALENDARIcon />
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      addOpenToAllDetailTags();
                    }}
                    style={{
                      marginRight: "1em",
                      outline: "none",
                      cursor: "default",
                    }}
                    className="items-center"
                  >
                    <div>
                      {detailIsOpen ? <COLLAPSEIcon /> : <EXPANDIcon />}
                    </div>
                  </button>
                </div>
                <div
                  id="fileTree"
                  className="fileBody"
                  style={{
                    marginTop: "0.2vh",
                    marginBottom: "2vh",
                    maxHeight: "70vh",
                    overflow: "hidden",
                    outline: "none",
                    overflowY: "scroll",
                    textOverflow: "ellipsis",
                  }}
                >
                  <FileTree
                    struct={struct}
                    onFileTreeClick={(path, name) => {
                      onFileTreeClick(path, name);
                    }}
                    path={path}
                    fileNameBox={fileNameBox}
                    parentDirClick={(path) => {
                      setParentDir(path);
                    }}
                    creatingFileOrFolder={creatingFileOrFolder}
                    setFileName={(name) => {
                      setFileName(name);
                    }}
                    isCreatingFolder={isCreatingFolder}
                    onDelete={(path, name) => onDelete(path, name)}
                  />
                </div>
                <div
                  className={"fixed util"}
                  style={{
                    bottom: "0.25rem",
                  }}
                >
                  <div
                    style={{
                      paddingLeft: "10px",
                      width: "17.5em",
                      maxWidth: "17.5em",
                    }}
                    className="menu"
                    role="button"
                    onClick={() => {
                      try {
                        setClick(true);
                        setSearch("");
                      } catch (err) {
                        console.log(err);
                      }
                    }}
                  >
                    Utilities
                    <span style={{ float: "right", marginRight: "2em" }}>
                      <code style={{ borderRadius: "2px" }}>⌘</code>{" "}
                      <code style={{ borderRadius: "2px" }}>k</code>
                    </span>
                    {click && (
                      <CMDK
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
                        onDocxConversion={converToDocx}
                        onPdfConversion={convertToPDF}
                        menuOpen={menuOpen}
                        onFileSelect={(file) => {
                          try {
                            saveFile();
                            setValue(file.body);
                            setName(file.name);
                            setPath(file.path);
                            setInsert(false);
                            setViewingTodo(false);
                            document.documentElement.scrollTop = 0;
                          } catch (err) {
                            console.log(err);
                          }
                        }}
                        name={name}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            width: "calc(100vw - 17.5em)",
            minWidth: "calc(100vw - 17.5em)",
            maxWidth: "calc(100vw - 17.5em)",
          }}
        >
          <div
            style={{
              paddingTop: "13vh",
              padding: "40px",
            }}
          >
            {insert ? (
              <div className="markdown-content">
                <div style={{ overflow: "hidden" }}>
                  <CodeMirror
                    ref={refs}
                    value={value}
                    height="100%"
                    width="100%"
                    theme={isDarkMode ? githubDark : xcodeLight}
                    basicSetup={false}
                    extensions={[
                      indentOnInput(),
                      codeFolding(),
                      foldGutter(),
                      markdown({
                        base: markdownLanguage,
                        codeLanguages: languages,
                        addKeymap: true,
                      }),
                      [EditorView.lineWrapping],
                    ]}
                    onChange={onChange}
                  />
                </div>
              </div>
            ) : (
              <>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ paddingTop: "1em", userSelect: "none" }}>
                    {checkObject(getMarkdown(value).metadata) &&
                    !isViewingTodo ? (
                      <>
                        <METADATE incoming={getMarkdown(value).metadata.date} />
                        <METATAGS incoming={getMarkdown(value).metadata.tags} />
                        <METAMATERIAL
                          incoming={getMarkdown(value).metadata.material}
                        />
                      </>
                    ) : null}
                  </div>
                  <div
                    id="previewArea"
                    style={{
                      marginTop: isViewingTodo ? "":  "2em",
                      marginBottom: "5em",
                      overflow: "scroll",
                    }}
                    className="third h-full w-full"
                    dangerouslySetInnerHTML={
                      !isViewingTodo ? getMarkdown(value).document : null
                    }
                  />

                  {isViewingTodo && <Todo />}
                </div>
              </>
            )}
            <div
              className="fixed inset-x-0 bottom-0 ButtomBar"
              style={{
                display: "inline",
                userSelect: "none",
                marginLeft: "17.55em",
                maxHeight: "10vh",
                marginTop: "20px",
              }}
            >
              {displayThesaurus && insert ? (
                <div
                  style={{
                    paddingTop: "5px",
                    paddingRight: "30px",
                    paddingBottom: "5px",
                    alignContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <li
                    id="thesaurusWords"
                    style={{
                      marginBottom: "5px",
                      listStyleType: "none",
                      marginRight: "10px",
                      display: "inline",
                    }}
                  >
                    {thesaurus.map((item, index) => {
                      return (
                        <ul
                          style={{
                            display: "inline",
                            overflowX: "scroll",
                            color: "grey",
                          }}
                        >
                          <span
                            style={{
                              textDecoration: `${
                                index === whichIsActive ? "underline" : "none"
                              }`,
                            }}
                          >
                            {item}
                          </span>
                        </ul>
                      );
                    })}
                  </li>
                </div>
              ) : finder ? (
                <>
                  <div
                    className="Left"
                    style={{
                      float: "left",
                      paddingLeft: "30px",
                      paddingTop: "5px",
                      paddingBottom: "5px",
                    }}
                  >
                    <span>
                      <b>Find:</b>
                      {found ? (
                        <form
                          style={{ display: "inline" }}
                          onSubmit={() => {
                            if (wordToFind.length < 1) {
                              toogleFinder(false);
                              return;
                            }
                            find(wordToFind);
                          }}
                        >
                          <input
                            id="finderInput"
                            autoFocus
                            className="createFile"
                            type="text"
                            placeholder="Search a word"
                            onChange={(e) =>
                              setWordToFind(e.target.value.toLowerCase())
                            }
                          />
                        </form>
                      ) : (
                        <span style={{ display: "inline" }}> Not Found</span>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="Left"
                    style={{
                      float: "left",
                      paddingLeft: "30px",
                      paddingTop: "5px",
                      paddingBottom: "5px",
                    }}
                  >
                    <span>{`${insert ? "INSERT" : "PREVIEW"}`}</span>
                    <div
                      style={{ display: "inline", marginRight: "30px" }}
                    ></div>
                    <span>{`${value.toString().split(" ").length}W ${
                      value.toString().length
                    }C `}</span>
                    <div
                      style={{ display: "inline", marginRight: "30px" }}
                    ></div>
                    <div
                      style={{
                        display: "inline",
                        color: "grey",
                        overflow: "hidden",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: insert ? cursor : progress(scroll),
                      }}
                    />
                    {isEdited && insert ? (
                      <>
                        <div
                          style={{ display: "inline", marginRight: "30px" }}
                        ></div>
                        <button
                          style={{
                            display: "inline",
                            color: "grey",
                            overflow: "hidden",
                          }}
                          id="save"
                          tabIndex={-1}
                          onClick={() => {
                            try {
                              saveFile();
                            } catch {
                              console.log("error");
                            }
                          }}
                        >
                          {saver}
                        </button>
                      </>
                    ) : null}
                  </div>
                  <div
                    className="Right"
                    style={{
                      float: "right",
                      paddingRight: "40px",
                      paddingTop: "5px",
                      paddingBottom: "5px",
                    }}
                  >
                    <div
                      style={{ display: "inline", marginLeft: "20px" }}
                    ></div>
                    {clockState}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
