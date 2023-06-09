// vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4:
var Module = typeof Module !== "undefined" ? Module : {};
if (!Module.expectedDataFileDownloads) {
  Module.expectedDataFileDownloads = 0;
  Module.finishedDataFileDownloads = 0
}
Module.expectedDataFileDownloads++;
(function() {
  var loadPackage = function(metadata) {
    var PACKAGE_PATH;
    if (typeof window === "object") {
      PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/")
    } else if (typeof location !== "undefined") {
      PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/")
    } else {
      throw "using preloaded data can only be done on a web page or in a web worker"

    }
    var PACKAGE_NAME = "fs.txt";
    var REMOTE_PACKAGE_BASE = "fs.txt";
    if (typeof Module["locateFilePackage"] === "function" && !Module["locateFile"]) {
      Module["locateFile"] = Module["locateFilePackage"];
      err("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)")
    }
    var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
    var REMOTE_PACKAGE_SIZE = metadata.remote_package_size;
    var PACKAGE_UUID = metadata.package_uuid;

    function fetchRemotePackage(packageName, packageSize, callback, errback) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", packageName, true);
      xhr.responseType = "arraybuffer";
      xhr.onprogress = function(event) {
        var url = packageName;
        var size = packageSize;
        if (event.total) size = event.total;
        if (event.loaded) {
          if (!xhr.addedTotal) {
            xhr.addedTotal = true;
            if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
            Module.dataFileDownloads[url] = {
              loaded: event.loaded,
              total: size
            }
          } else {
            Module.dataFileDownloads[url].loaded = event.loaded
          }
          var total = 0;
          var loaded = 0;
          var num = 0;
          for (var download in Module.dataFileDownloads) {
            var data = Module.dataFileDownloads[download];
            total += data.total;
            loaded += data.loaded;
            num++
          }
          total = Math.ceil(total * Module.expectedDataFileDownloads / num);
          if (Module["setStatus"]) Module["setStatus"]("Downloading data... (" + loaded + "/" + total + ")")
        } else if (!Module.dataFileDownloads) {
          if (Module["setStatus"]) Module["setStatus"]("Downloading data...")
        }
      };
      xhr.onerror = function(event) {
        throw new Error("NetworkError for: " + packageName)
      };
      xhr.onload = function(event) {
        if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || xhr.status == 0 && xhr.response) {
          var packageData = xhr.response;
          callback(packageData)
        } else {
          throw new Error(xhr.statusText + " : " + xhr.responseURL)
        }
      };
      xhr.send(null)
    }

    function handleError(error) {
      console.error("package error:", error)
    }
    var fetchedCallback = null;
    var fetched = Module["getPreloadedPackage"] ? Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;
    if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
      if (fetchedCallback) {
        fetchedCallback(data);
        fetchedCallback = null
      } else {
        fetched = data
      }
    }, handleError);

    function runWithFS() {
      function assert(check, msg) {
        if (!check) throw msg + (new Error).stack
      }
      Module["FS_createPath"]("/", "usr", true, true);
      Module["FS_createPath"]("/usr", "local", true, true);
      Module["FS_createPath"]("/usr/local", "share", true, true);
      Module["FS_createPath"]("/usr/local/share", "vim", true, true);
      Module["FS_createPath"]("/usr/local/share/vim", "indent", true, true);
      Module["FS_createPath"]("/usr/local/share/vim", "ftplugin", true, true);
      Module["FS_createPath"]("/usr/local/share/vim", "plugin", true, true);
      Module["FS_createPath"]("/usr/local/share/vim", "colors", true, true);
      Module["FS_createPath"]("/usr/local/share/vim", "autoload", true, true);
      Module["FS_createPath"]("/usr/local/share/vim/autoload", "dist", true, true);
      Module["FS_createPath"]("/usr/local/share/vim/autoload", "xml", true, true);
      Module["FS_createPath"]("/usr/local/share/vim", "syntax", true, true);
      Module["FS_createPath"]("/", "home", true, true);
      Module["FS_createPath"]("/home", "web_user", true, true);

      function DataRequest(start, end, audio) {
        this.start = start;
        this.end = end;
        this.audio = audio
      }
      DataRequest.prototype = {
        requests: {},
        open: function(mode, name) {
          this.name = name;
          this.requests[name] = this;
          Module["addRunDependency"]("fp " + this.name)
        },
        send: function() {},
        onload: function() {
          var byteArray = this.byteArray.subarray(this.start, this.end);
          this.finish(byteArray)
        },
        finish: function(byteArray) {
          var that = this;
          Module["FS_createDataFile"](this.name, null, byteArray, true, true, true);
          Module["removeRunDependency"]("fp " + that.name);
          this.requests[this.name] = null
        }
      };
      var files = metadata.files;
      for (var i = 0; i < files.length; ++i) {
        new DataRequest(files[i].start, files[i].end, files[i].audio).open("GET", files[i].filename)
      }

      function processPackageData(arrayBuffer) {
        Module.finishedDataFileDownloads++;
        assert(arrayBuffer, "Loading data file failed.");
        assert(arrayBuffer instanceof ArrayBuffer, "bad input to processPackageData");
        var byteArray = new Uint8Array(arrayBuffer);
        DataRequest.prototype.byteArray = byteArray;
        var files = metadata.files;
        for (var i = 0; i < files.length; ++i) {
          DataRequest.prototype.requests[files[i].filename].onload()
        }
        Module["removeRunDependency"]("datafile_vim.data")
      }
      Module["addRunDependency"]("datafile_vim.data");
      if (!Module.preloadResults) Module.preloadResults = {};
      Module.preloadResults[PACKAGE_NAME] = {
        fromCache: false
      };
      if (fetched) {
        processPackageData(fetched);
        fetched = null
      } else {
        fetchedCallback = processPackageData
      }
    }
    if (Module["calledRun"]) {
      runWithFS()
    } else {
      if (!Module["preRun"]) Module["preRun"] = [];
      Module["preRun"].push(runWithFS)
    }
  };
  loadPackage({
    files: [{
      start: 0,
      audio: 0,
      end: 82,
      filename: "/usr/local/share/vim/indoff.vim"
    }, {
      start: 82,
      audio: 0,
      end: 6750,
      filename: "/usr/local/share/vim/scripts.vim"
    }, {
      start: 6750,
      audio: 0,
      end: 6875,
      filename: "/usr/local/share/vim/ftplugof.vim"
    }, {
      start: 6875,
      audio: 0,
      end: 7288,
      filename: "/usr/local/share/vim/indent.vim"
    }, {
      start: 7288,
      audio: 0,
      end: 7380,
      filename: "/usr/local/share/vim/ftoff.vim"
    }, {
      start: 7380,
      audio: 0,
      end: 8841,
      filename: "/usr/local/share/vim/vimrc"
    }, {
      start: 8841,
      audio: 0,
      end: 51520,
      filename: "/usr/local/share/vim/filetype.vim"
    }, {
      start: 51520,
      audio: 0,
      end: 52031,
      filename: "/usr/local/share/vim/ftplugin.vim"
    }, {
      start: 52031,
      audio: 0,
      end: 52062,
      filename: "/usr/local/share/vim/indent/javascriptreact.vim"
    }, {
      start: 52062,
      audio: 0,
      end: 52126,
      filename: "/usr/local/share/vim/indent/raml.vim"
    }, {
      start: 52126,
      audio: 0,
      end: 52972,
      filename: "/usr/local/share/vim/indent/mma.vim"
    }, {
      start: 52972,
      audio: 0,
      end: 54048,
      filename: "/usr/local/share/vim/indent/config.vim"
    }, {
      start: 54048,
      audio: 0,
      end: 54157,
      filename: "/usr/local/share/vim/indent/cuda.vim"
    }, {
      start: 54157,
      audio: 0,
      end: 57007,
      filename: "/usr/local/share/vim/indent/pascal.vim"
    }, {
      start: 57007,
      audio: 0,
      end: 61424,
      filename: "/usr/local/share/vim/indent/fortran.vim"
    }, {
      start: 61424,
      audio: 0,
      end: 66179,
      filename: "/usr/local/share/vim/indent/sqlanywhere.vim"
    }, {
      start: 66179,
      audio: 0,
      end: 66825,
      filename: "/usr/local/share/vim/indent/tcsh.vim"
    }, {
      start: 66825,
      audio: 0,
      end: 68157,
      filename: "/usr/local/share/vim/indent/rmd.vim"
    }, {
      start: 68157,
      audio: 0,
      end: 68626,
      filename: "/usr/local/share/vim/indent/eterm.vim"
    }, {
      start: 68626,
      audio: 0,
      end: 80425,
      filename: "/usr/local/share/vim/indent/javascript.vim"
    }, {
      start: 80425,
      audio: 0,
      end: 80488,
      filename: "/usr/local/share/vim/indent/xslt.vim"
    }, {
      start: 80488,
      audio: 0,
      end: 84219,
      filename: "/usr/local/share/vim/indent/matlab.vim"
    }, {
      start: 84219,
      audio: 0,
      end: 84282,
      filename: "/usr/local/share/vim/indent/ant.vim"
    }, {
      start: 84282,
      audio: 0,
      end: 87327,
      filename: "/usr/local/share/vim/indent/xml.vim"
    }, {
      start: 87327,
      audio: 0,
      end: 87836,
      filename: "/usr/local/share/vim/indent/readline.vim"
    }, {
      start: 87836,
      audio: 0,
      end: 90298,
      filename: "/usr/local/share/vim/indent/java.vim"
    }, {
      start: 90298,
      audio: 0,
      end: 91054,
      filename: "/usr/local/share/vim/indent/sass.vim"
    }, {
      start: 91054,
      audio: 0,
      end: 93737,
      filename: "/usr/local/share/vim/indent/rust.vim"
    }, {
      start: 93737,
      audio: 0,
      end: 95561,
      filename: "/usr/local/share/vim/indent/sdl.vim"
    }, {
      start: 95561,
      audio: 0,
      end: 95625,
      filename: "/usr/local/share/vim/indent/jsp.vim"
    }, {
      start: 95625,
      audio: 0,
      end: 96027,
      filename: "/usr/local/share/vim/indent/sql.vim"
    }, {
      start: 96027,
      audio: 0,
      end: 96144,
      filename: "/usr/local/share/vim/indent/bash.vim"
    }, {
      start: 96144,
      audio: 0,
      end: 96408,
      filename: "/usr/local/share/vim/indent/lifelines.vim"
    }, {
      start: 96408,
      audio: 0,
      end: 96547,
      filename: "/usr/local/share/vim/indent/docbk.vim"
    }, {
      start: 96547,
      audio: 0,
      end: 97054,
      filename: "/usr/local/share/vim/indent/xf86conf.vim"
    }, {
      start: 97054,
      audio: 0,
      end: 99628,
      filename: "/usr/local/share/vim/indent/zimbu.vim"
    }, {
      start: 99628,
      audio: 0,
      end: 101554,
      filename: "/usr/local/share/vim/indent/haml.vim"
    }, {
      start: 101554,
      audio: 0,
      end: 101617,
      filename: "/usr/local/share/vim/indent/scss.vim"
    }, {
      start: 101617,
      audio: 0,
      end: 103132,
      filename: "/usr/local/share/vim/indent/tcl.vim"
    }, {
      start: 103132,
      audio: 0,
      end: 103241,
      filename: "/usr/local/share/vim/indent/bib.vim"
    }, {
      start: 103241,
      audio: 0,
      end: 104394,
      filename: "/usr/local/share/vim/indent/objc.vim"
    }, {
      start: 104394,
      audio: 0,
      end: 104506,
      filename: "/usr/local/share/vim/indent/lisp.vim"
    }, {
      start: 104506,
      audio: 0,
      end: 105307,
      filename: "/usr/local/share/vim/indent/gitolite.vim"
    }, {
      start: 105307,
      audio: 0,
      end: 111832,
      filename: "/usr/local/share/vim/indent/systemverilog.vim"
    }, {
      start: 111832,
      audio: 0,
      end: 113050,
      filename: "/usr/local/share/vim/indent/rpl.vim"
    }, {
      start: 113050,
      audio: 0,
      end: 115781,
      filename: "/usr/local/share/vim/indent/perl.vim"
    }, {
      start: 115781,
      audio: 0,
      end: 130936,
      filename: "/usr/local/share/vim/indent/scala.vim"
    }, {
      start: 130936,
      audio: 0,
      end: 131045,
      filename: "/usr/local/share/vim/indent/cpp.vim"
    }, {
      start: 131045,
      audio: 0,
      end: 148404,
      filename: "/usr/local/share/vim/indent/ruby.vim"
    }, {
      start: 148404,
      audio: 0,
      end: 149811,
      filename: "/usr/local/share/vim/indent/ld.vim"
    }, {
      start: 149811,
      audio: 0,
      end: 155550,
      filename: "/usr/local/share/vim/indent/ada.vim"
    }, {
      start: 155550,
      audio: 0,
      end: 155612,
      filename: "/usr/local/share/vim/indent/zsh.vim"
    }, {
      start: 155612,
      audio: 0,
      end: 156600,
      filename: "/usr/local/share/vim/indent/idlang.vim"
    }, {
      start: 156600,
      audio: 0,
      end: 159879,
      filename: "/usr/local/share/vim/indent/sas.vim"
    }, {
      start: 159879,
      audio: 0,
      end: 162096,
      filename: "/usr/local/share/vim/indent/json.vim"
    }, {
      start: 162096,
      audio: 0,
      end: 162160,
      filename: "/usr/local/share/vim/indent/automake.vim"
    }, {
      start: 162160,
      audio: 0,
      end: 168700,
      filename: "/usr/local/share/vim/indent/vhdl.vim"
    }, {
      start: 168700,
      audio: 0,
      end: 169221,
      filename: "/usr/local/share/vim/indent/treetop.vim"
    }, {
      start: 169221,
      audio: 0,
      end: 169337,
      filename: "/usr/local/share/vim/indent/mail.vim"
    }, {
      start: 169337,
      audio: 0,
      end: 170338,
      filename: "/usr/local/share/vim/indent/rst.vim"
    }, {
      start: 170338,
      audio: 0,
      end: 174153,
      filename: "/usr/local/share/vim/indent/python.vim"
    }, {
      start: 174153,
      audio: 0,
      end: 175034,
      filename: "/usr/local/share/vim/indent/rrst.vim"
    }, {
      start: 175034,
      audio: 0,
      end: 175111,
      filename: "/usr/local/share/vim/indent/ch.vim"
    }, {
      start: 175111,
      audio: 0,
      end: 177425,
      filename: "/usr/local/share/vim/indent/make.vim"
    }, {
      start: 177425,
      audio: 0,
      end: 178705,
      filename: "/usr/local/share/vim/indent/ishd.vim"
    }, {
      start: 178705,
      audio: 0,
      end: 180964,
      filename: "/usr/local/share/vim/indent/eruby.vim"
    }, {
      start: 180964,
      audio: 0,
      end: 181141,
      filename: "/usr/local/share/vim/indent/wast.vim"
    }, {
      start: 181141,
      audio: 0,
      end: 185874,
      filename: "/usr/local/share/vim/indent/mp.vim"
    }, {
      start: 185874,
      audio: 0,
      end: 188136,
      filename: "/usr/local/share/vim/indent/vim.vim"
    }, {
      start: 188136,
      audio: 0,
      end: 188159,
      filename: "/usr/local/share/vim/indent/mf.vim"
    }, {
      start: 188159,
      audio: 0,
      end: 190210,
      filename: "/usr/local/share/vim/indent/eiffel.vim"
    }, {
      start: 190210,
      audio: 0,
      end: 212440,
      filename: "/usr/local/share/vim/indent/erlang.vim"
    }, {
      start: 212440,
      audio: 0,
      end: 213409,
      filename: "/usr/local/share/vim/indent/lua.vim"
    }, {
      start: 213409,
      audio: 0,
      end: 214337,
      filename: "/usr/local/share/vim/indent/tf.vim"
    }, {
      start: 214337,
      audio: 0,
      end: 215446,
      filename: "/usr/local/share/vim/indent/j.vim"
    }, {
      start: 215446,
      audio: 0,
      end: 217119,
      filename: "/usr/local/share/vim/indent/liquid.vim"
    }, {
      start: 217119,
      audio: 0,
      end: 222742,
      filename: "/usr/local/share/vim/indent/verilog.vim"
    }, {
      start: 222742,
      audio: 0,
      end: 223483,
      filename: "/usr/local/share/vim/indent/prolog.vim"
    }, {
      start: 223483,
      audio: 0,
      end: 228316,
      filename: "/usr/local/share/vim/indent/tex.vim"
    }, {
      start: 228316,
      audio: 0,
      end: 229860,
      filename: "/usr/local/share/vim/indent/dylan.vim"
    }, {
      start: 229860,
      audio: 0,
      end: 231225,
      filename: "/usr/local/share/vim/indent/perl6.vim"
    }, {
      start: 231225,
      audio: 0,
      end: 231289,
      filename: "/usr/local/share/vim/indent/scheme.vim"
    }, {
      start: 231289,
      audio: 0,
      end: 232600,
      filename: "/usr/local/share/vim/indent/vb.vim"
    }, {
      start: 232600,
      audio: 0,
      end: 233741,
      filename: "/usr/local/share/vim/indent/hog.vim"
    }, {
      start: 233741,
      audio: 0,
      end: 233844,
      filename: "/usr/local/share/vim/indent/changelog.vim"
    }, {
      start: 233844,
      audio: 0,
      end: 235365,
      filename: "/usr/local/share/vim/indent/bzl.vim"
    }, {
      start: 235365,
      audio: 0,
      end: 238776,
      filename: "/usr/local/share/vim/indent/occam.vim"
    }, {
      start: 238776,
      audio: 0,
      end: 244624,
      filename: "/usr/local/share/vim/indent/ocaml.vim"
    }, {
      start: 244624,
      audio: 0,
      end: 252800,
      filename: "/usr/local/share/vim/indent/falcon.vim"
    }, {
      start: 252800,
      audio: 0,
      end: 256737,
      filename: "/usr/local/share/vim/indent/sml.vim"
    }, {
      start: 256737,
      audio: 0,
      end: 267791,
      filename: "/usr/local/share/vim/indent/r.vim"
    }, {
      start: 267791,
      audio: 0,
      end: 268727,
      filename: "/usr/local/share/vim/indent/xinetd.vim"
    }, {
      start: 268727,
      audio: 0,
      end: 268804,
      filename: "/usr/local/share/vim/indent/d.vim"
    }, {
      start: 268804,
      audio: 0,
      end: 269618,
      filename: "/usr/local/share/vim/indent/tilde.vim"
    }, {
      start: 269618,
      audio: 0,
      end: 269684,
      filename: "/usr/local/share/vim/indent/systemd.vim"
    }, {
      start: 269684,
      audio: 0,
      end: 272057,
      filename: "/usr/local/share/vim/indent/nsis.vim"
    }, {
      start: 272057,
      audio: 0,
      end: 294063,
      filename: "/usr/local/share/vim/indent/php.vim"
    }, {
      start: 294063,
      audio: 0,
      end: 294172,
      filename: "/usr/local/share/vim/indent/dtrace.vim"
    }, {
      start: 294172,
      audio: 0,
      end: 294235,
      filename: "/usr/local/share/vim/indent/xsd.vim"
    }, {
      start: 294235,
      audio: 0,
      end: 295255,
      filename: "/usr/local/share/vim/indent/logtalk.vim"
    }, {
      start: 295255,
      audio: 0,
      end: 295450,
      filename: "/usr/local/share/vim/indent/vroom.vim"
    }, {
      start: 295450,
      audio: 0,
      end: 296839,
      filename: "/usr/local/share/vim/indent/css.vim"
    }, {
      start: 296839,
      audio: 0,
      end: 297953,
      filename: "/usr/local/share/vim/indent/cs.vim"
    }, {
      start: 297953,
      audio: 0,
      end: 298744,
      filename: "/usr/local/share/vim/indent/rnoweb.vim"
    }, {
      start: 298744,
      audio: 0,
      end: 301229,
      filename: "/usr/local/share/vim/indent/cdl.vim"
    }, {
      start: 301229,
      audio: 0,
      end: 303550,
      filename: "/usr/local/share/vim/indent/rhelp.vim"
    }, {
      start: 303550,
      audio: 0,
      end: 311826,
      filename: "/usr/local/share/vim/indent/typescript.vim"
    }, {
      start: 311826,
      audio: 0,
      end: 312417,
      filename: "/usr/local/share/vim/indent/gitconfig.vim"
    }, {
      start: 312417,
      audio: 0,
      end: 312591,
      filename: "/usr/local/share/vim/indent/dictconf.vim"
    }, {
      start: 312591,
      audio: 0,
      end: 314567,
      filename: "/usr/local/share/vim/indent/cucumber.vim"
    }, {
      start: 314567,
      audio: 0,
      end: 314633,
      filename: "/usr/local/share/vim/indent/pyrex.vim"
    }, {
      start: 314633,
      audio: 0,
      end: 315464,
      filename: "/usr/local/share/vim/indent/postscr.vim"
    }, {
      start: 315464,
      audio: 0,
      end: 315573,
      filename: "/usr/local/share/vim/indent/c.vim"
    }, {
      start: 315573,
      audio: 0,
      end: 321151,
      filename: "/usr/local/share/vim/indent/dtd.vim"
    }, {
      start: 321151,
      audio: 0,
      end: 321215,
      filename: "/usr/local/share/vim/indent/htmldjango.vim"
    }, {
      start: 321215,
      audio: 0,
      end: 322082,
      filename: "/usr/local/share/vim/indent/dosbatch.vim"
    }, {
      start: 322082,
      audio: 0,
      end: 322702,
      filename: "/usr/local/share/vim/indent/framescript.vim"
    }, {
      start: 322702,
      audio: 0,
      end: 326460,
      filename: "/usr/local/share/vim/indent/yaml.vim"
    }, {
      start: 326460,
      audio: 0,
      end: 329571,
      filename: "/usr/local/share/vim/indent/awk.vim"
    }, {
      start: 329571,
      audio: 0,
      end: 330140,
      filename: "/usr/local/share/vim/indent/chaiscript.vim"
    }, {
      start: 330140,
      audio: 0,
      end: 330206,
      filename: "/usr/local/share/vim/indent/aap.vim"
    }, {
      start: 330206,
      audio: 0,
      end: 330380,
      filename: "/usr/local/share/vim/indent/dictdconf.vim"
    }, {
      start: 330380,
      audio: 0,
      end: 330443,
      filename: "/usr/local/share/vim/indent/less.vim"
    }, {
      start: 330443,
      audio: 0,
      end: 336760,
      filename: "/usr/local/share/vim/indent/clojure.vim"
    }, {
      start: 336760,
      audio: 0,
      end: 336824,
      filename: "/usr/local/share/vim/indent/xhtml.vim"
    }, {
      start: 336824,
      audio: 0,
      end: 355152,
      filename: "/usr/local/share/vim/indent/html.vim"
    }, {
      start: 355152,
      audio: 0,
      end: 356541,
      filename: "/usr/local/share/vim/indent/bst.vim"
    }, {
      start: 356541,
      audio: 0,
      end: 358343,
      filename: "/usr/local/share/vim/indent/cmake.vim"
    }, {
      start: 358343,
      audio: 0,
      end: 359110,
      filename: "/usr/local/share/vim/indent/go.vim"
    }, {
      start: 359110,
      audio: 0,
      end: 359578,
      filename: "/usr/local/share/vim/indent/context.vim"
    }, {
      start: 359578,
      audio: 0,
      end: 361015,
      filename: "/usr/local/share/vim/indent/pov.vim"
    }, {
      start: 361015,
      audio: 0,
      end: 364042,
      filename: "/usr/local/share/vim/indent/meson.vim"
    }, {
      start: 364042,
      audio: 0,
      end: 364915,
      filename: "/usr/local/share/vim/indent/teraterm.vim"
    }, {
      start: 364915,
      audio: 0,
      end: 370992,
      filename: "/usr/local/share/vim/indent/sh.vim"
    }, {
      start: 370992,
      audio: 0,
      end: 371485,
      filename: "/usr/local/share/vim/indent/yacc.vim"
    }, {
      start: 371485,
      audio: 0,
      end: 377358,
      filename: "/usr/local/share/vim/indent/cobol.vim"
    }, {
      start: 377358,
      audio: 0,
      end: 378163,
      filename: "/usr/local/share/vim/indent/hamster.vim"
    }, {
      start: 378163,
      audio: 0,
      end: 378196,
      filename: "/usr/local/share/vim/ftplugin/javascriptreact.vim"
    }, {
      start: 378196,
      audio: 0,
      end: 378340,
      filename: "/usr/local/share/vim/ftplugin/mma.vim"
    }, {
      start: 378340,
      audio: 0,
      end: 378612,
      filename: "/usr/local/share/vim/ftplugin/8th.vim"
    }, {
      start: 378612,
      audio: 0,
      end: 379290,
      filename: "/usr/local/share/vim/ftplugin/config.vim"
    }, {
      start: 379290,
      audio: 0,
      end: 379705,
      filename: "/usr/local/share/vim/ftplugin/pascal.vim"
    }, {
      start: 379705,
      audio: 0,
      end: 382244,
      filename: "/usr/local/share/vim/ftplugin/fortran.vim"
    }, {
      start: 382244,
      audio: 0,
      end: 382864,
      filename: "/usr/local/share/vim/ftplugin/tcsh.vim"
    }, {
      start: 382864,
      audio: 0,
      end: 384089,
      filename: "/usr/local/share/vim/ftplugin/rmd.vim"
    }, {
      start: 384089,
      audio: 0,
      end: 384383,
      filename: "/usr/local/share/vim/ftplugin/eterm.vim"
    }, {
      start: 384383,
      audio: 0,
      end: 384887,
      filename: "/usr/local/share/vim/ftplugin/javascript.vim"
    }, {
      start: 384887,
      audio: 0,
      end: 386133,
      filename: "/usr/local/share/vim/ftplugin/aspvbs.vim"
    }, {
      start: 386133,
      audio: 0,
      end: 386228,
      filename: "/usr/local/share/vim/ftplugin/nroff.vim"
    }, {
      start: 386228,
      audio: 0,
      end: 386495,
      filename: "/usr/local/share/vim/ftplugin/xslt.vim"
    }, {
      start: 386495,
      audio: 0,
      end: 386690,
      filename: "/usr/local/share/vim/ftplugin/fvwm.vim"
    }, {
      start: 386690,
      audio: 0,
      end: 386927,
      filename: "/usr/local/share/vim/ftplugin/reva.vim"
    }, {
      start: 386927,
      audio: 0,
      end: 387539,
      filename: "/usr/local/share/vim/ftplugin/matlab.vim"
    }, {
      start: 387539,
      audio: 0,
      end: 388287,
      filename: "/usr/local/share/vim/ftplugin/ant.vim"
    }, {
      start: 388287,
      audio: 0,
      end: 389438,
      filename: "/usr/local/share/vim/ftplugin/xml.vim"
    }, {
      start: 389438,
      audio: 0,
      end: 389697,
      filename: "/usr/local/share/vim/ftplugin/readline.vim"
    }, {
      start: 389697,
      audio: 0,
      end: 389820,
      filename: "/usr/local/share/vim/ftplugin/hgcommit.vim"
    }, {
      start: 389820,
      audio: 0,
      end: 390642,
      filename: "/usr/local/share/vim/ftplugin/java.vim"
    }, {
      start: 390642,
      audio: 0,
      end: 391415,
      filename: "/usr/local/share/vim/ftplugin/sass.vim"
    }, {
      start: 391415,
      audio: 0,
      end: 395790,
      filename: "/usr/local/share/vim/ftplugin/rust.vim"
    }, {
      start: 395790,
      audio: 0,
      end: 397056,
      filename: "/usr/local/share/vim/ftplugin/jsp.vim"
    }, {
      start: 397056,
      audio: 0,
      end: 397315,
      filename: "/usr/local/share/vim/ftplugin/fetchmail.vim"
    }, {
      start: 397315,
      audio: 0,
      end: 406358,
      filename: "/usr/local/share/vim/ftplugin/sql.vim"
    }, {
      start: 406358,
      audio: 0,
      end: 407628,
      filename: "/usr/local/share/vim/ftplugin/chicken.vim"
    }, {
      start: 407628,
      audio: 0,
      end: 407785,
      filename: "/usr/local/share/vim/ftplugin/bash.vim"
    }, {
      start: 407785,
      audio: 0,
      end: 408313,
      filename: "/usr/local/share/vim/ftplugin/registry.vim"
    }, {
      start: 408313,
      audio: 0,
      end: 408594,
      filename: "/usr/local/share/vim/ftplugin/bdf.vim"
    }, {
      start: 408594,
      audio: 0,
      end: 413453,
      filename: "/usr/local/share/vim/ftplugin/spec.vim"
    }, {
      start: 413453,
      audio: 0,
      end: 413785,
      filename: "/usr/local/share/vim/ftplugin/haskell.vim"
    }, {
      start: 413785,
      audio: 0,
      end: 413893,
      filename: "/usr/local/share/vim/ftplugin/tt2html.vim"
    }, {
      start: 413893,
      audio: 0,
      end: 414268,
      filename: "/usr/local/share/vim/ftplugin/docbk.vim"
    }, {
      start: 414268,
      audio: 0,
      end: 414527,
      filename: "/usr/local/share/vim/ftplugin/xf86conf.vim"
    }, {
      start: 414527,
      audio: 0,
      end: 414786,
      filename: "/usr/local/share/vim/ftplugin/services.vim"
    }, {
      start: 414786,
      audio: 0,
      end: 419024,
      filename: "/usr/local/share/vim/ftplugin/zimbu.vim"
    }, {
      start: 419024,
      audio: 0,
      end: 420460,
      filename: "/usr/local/share/vim/ftplugin/haml.vim"
    }, {
      start: 420460,
      audio: 0,
      end: 420567,
      filename: "/usr/local/share/vim/ftplugin/scss.vim"
    }, {
      start: 420567,
      audio: 0,
      end: 420872,
      filename: "/usr/local/share/vim/ftplugin/muttrc.vim"
    }, {
      start: 420872,
      audio: 0,
      end: 421131,
      filename: "/usr/local/share/vim/ftplugin/loginaccess.vim"
    }, {
      start: 421131,
      audio: 0,
      end: 421390,
      filename: "/usr/local/share/vim/ftplugin/xmodmap.vim"
    }, {
      start: 421390,
      audio: 0,
      end: 421863,
      filename: "/usr/local/share/vim/ftplugin/tcl.vim"
    }, {
      start: 421863,
      audio: 0,
      end: 422148,
      filename: "/usr/local/share/vim/ftplugin/racc.vim"
    }, {
      start: 422148,
      audio: 0,
      end: 422285,
      filename: "/usr/local/share/vim/ftplugin/dockerfile.vim"
    }, {
      start: 422285,
      audio: 0,
      end: 422384,
      filename: "/usr/local/share/vim/ftplugin/objc.vim"
    }, {
      start: 422384,
      audio: 0,
      end: 422643,
      filename: "/usr/local/share/vim/ftplugin/conf.vim"
    }, {
      start: 422643,
      audio: 0,
      end: 422994,
      filename: "/usr/local/share/vim/ftplugin/lisp.vim"
    }, {
      start: 422994,
      audio: 0,
      end: 423065,
      filename: "/usr/local/share/vim/ftplugin/systemverilog.vim"
    }, {
      start: 423065,
      audio: 0,
      end: 423264,
      filename: "/usr/local/share/vim/ftplugin/rpl.vim"
    }, {
      start: 423264,
      audio: 0,
      end: 424724,
      filename: "/usr/local/share/vim/ftplugin/perl.vim"
    }, {
      start: 424724,
      audio: 0,
      end: 424983,
      filename: "/usr/local/share/vim/ftplugin/terminfo.vim"
    }, {
      start: 424983,
      audio: 0,
      end: 425584,
      filename: "/usr/local/share/vim/ftplugin/scala.vim"
    }, {
      start: 425584,
      audio: 0,
      end: 425782,
      filename: "/usr/local/share/vim/ftplugin/mrxvtrc.vim"
    }, {
      start: 425782,
      audio: 0,
      end: 426041,
      filename: "/usr/local/share/vim/ftplugin/manconf.vim"
    }, {
      start: 426041,
      audio: 0,
      end: 426140,
      filename: "/usr/local/share/vim/ftplugin/cpp.vim"
    }, {
      start: 426140,
      audio: 0,
      end: 426399,
      filename: "/usr/local/share/vim/ftplugin/sshconfig.vim"
    }, {
      start: 426399,
      audio: 0,
      end: 441331,
      filename: "/usr/local/share/vim/ftplugin/ruby.vim"
    }, {
      start: 441331,
      audio: 0,
      end: 441640,
      filename: "/usr/local/share/vim/ftplugin/ld.vim"
    }, {
      start: 441640,
      audio: 0,
      end: 445137,
      filename: "/usr/local/share/vim/ftplugin/ada.vim"
    }, {
      start: 445137,
      audio: 0,
      end: 445613,
      filename: "/usr/local/share/vim/ftplugin/zsh.vim"
    }, {
      start: 445613,
      audio: 0,
      end: 445874,
      filename: "/usr/local/share/vim/ftplugin/quake.vim"
    }, {
      start: 445874,
      audio: 0,
      end: 446220,
      filename: "/usr/local/share/vim/ftplugin/abap.vim"
    }, {
      start: 446220,
      audio: 0,
      end: 446426,
      filename: "/usr/local/share/vim/ftplugin/json.vim"
    }, {
      start: 446426,
      audio: 0,
      end: 446607,
      filename: "/usr/local/share/vim/ftplugin/automake.vim"
    }, {
      start: 446607,
      audio: 0,
      end: 448940,
      filename: "/usr/local/share/vim/ftplugin/vhdl.vim"
    }, {
      start: 448940,
      audio: 0,
      end: 449200,
      filename: "/usr/local/share/vim/ftplugin/treetop.vim"
    }, {
      start: 449200,
      audio: 0,
      end: 449459,
      filename: "/usr/local/share/vim/ftplugin/pinfo.vim"
    }, {
      start: 449459,
      audio: 0,
      end: 449981,
      filename: "/usr/local/share/vim/ftplugin/mail.vim"
    }, {
      start: 449981,
      audio: 0,
      end: 450689,
      filename: "/usr/local/share/vim/ftplugin/rst.vim"
    }, {
      start: 450689,
      audio: 0,
      end: 457373,
      filename: "/usr/local/share/vim/ftplugin/python.vim"
    }, {
      start: 457373,
      audio: 0,
      end: 458418,
      filename: "/usr/local/share/vim/ftplugin/rrst.vim"
    }, {
      start: 458418,
      audio: 0,
      end: 458670,
      filename: "/usr/local/share/vim/ftplugin/group.vim"
    }, {
      start: 458670,
      audio: 0,
      end: 458793,
      filename: "/usr/local/share/vim/ftplugin/diff.vim"
    }, {
      start: 458793,
      audio: 0,
      end: 459572,
      filename: "/usr/local/share/vim/ftplugin/csh.vim"
    }, {
      start: 459572,
      audio: 0,
      end: 459847,
      filename: "/usr/local/share/vim/ftplugin/m4.vim"
    }, {
      start: 459847,
      audio: 0,
      end: 460106,
      filename: "/usr/local/share/vim/ftplugin/crm.vim"
    }, {
      start: 460106,
      audio: 0,
      end: 460205,
      filename: "/usr/local/share/vim/ftplugin/ch.vim"
    }, {
      start: 460205,
      audio: 0,
      end: 460476,
      filename: "/usr/local/share/vim/ftplugin/slpreg.vim"
    }, {
      start: 460476,
      audio: 0,
      end: 460596,
      filename: "/usr/local/share/vim/ftplugin/btm.vim"
    }, {
      start: 460596,
      audio: 0,
      end: 461715,
      filename: "/usr/local/share/vim/ftplugin/git.vim"
    }, {
      start: 461715,
      audio: 0,
      end: 461974,
      filename: "/usr/local/share/vim/ftplugin/logindefs.vim"
    }, {
      start: 461974,
      audio: 0,
      end: 462462,
      filename: "/usr/local/share/vim/ftplugin/make.vim"
    }, {
      start: 462462,
      audio: 0,
      end: 463462,
      filename: "/usr/local/share/vim/ftplugin/ishd.vim"
    }, {
      start: 463462,
      audio: 0,
      end: 463721,
      filename: "/usr/local/share/vim/ftplugin/mailcap.vim"
    }, {
      start: 463721,
      audio: 0,
      end: 463992,
      filename: "/usr/local/share/vim/ftplugin/sysctl.vim"
    }, {
      start: 463992,
      audio: 0,
      end: 464251,
      filename: "/usr/local/share/vim/ftplugin/sensors.vim"
    }, {
      start: 464251,
      audio: 0,
      end: 465487,
      filename: "/usr/local/share/vim/ftplugin/debcontrol.vim"
    }, {
      start: 465487,
      audio: 0,
      end: 465764,
      filename: "/usr/local/share/vim/ftplugin/indent.vim"
    }, {
      start: 465764,
      audio: 0,
      end: 469671,
      filename: "/usr/local/share/vim/ftplugin/eruby.vim"
    }, {
      start: 469671,
      audio: 0,
      end: 469933,
      filename: "/usr/local/share/vim/ftplugin/wast.vim"
    }, {
      start: 469933,
      audio: 0,
      end: 473227,
      filename: "/usr/local/share/vim/ftplugin/mp.vim"
    }, {
      start: 473227,
      audio: 0,
      end: 473486,
      filename: "/usr/local/share/vim/ftplugin/sudoers.vim"
    }, {
      start: 473486,
      audio: 0,
      end: 476063,
      filename: "/usr/local/share/vim/ftplugin/vim.vim"
    }, {
      start: 476063,
      audio: 0,
      end: 478934,
      filename: "/usr/local/share/vim/ftplugin/mf.vim"
    }, {
      start: 478934,
      audio: 0,
      end: 480657,
      filename: "/usr/local/share/vim/ftplugin/markdown.vim"
    }, {
      start: 480657,
      audio: 0,
      end: 484293,
      filename: "/usr/local/share/vim/ftplugin/eiffel.vim"
    }, {
      start: 484293,
      audio: 0,
      end: 485768,
      filename: "/usr/local/share/vim/ftplugin/erlang.vim"
    }, {
      start: 485768,
      audio: 0,
      end: 486269,
      filename: "/usr/local/share/vim/ftplugin/lua.vim"
    }, {
      start: 486269,
      audio: 0,
      end: 486528,
      filename: "/usr/local/share/vim/ftplugin/denyhosts.vim"
    }, {
      start: 486528,
      audio: 0,
      end: 486740,
      filename: "/usr/local/share/vim/ftplugin/groovy.vim"
    }, {
      start: 486740,
      audio: 0,
      end: 487011,
      filename: "/usr/local/share/vim/ftplugin/slpconf.vim"
    }, {
      start: 487011,
      audio: 0,
      end: 487038,
      filename: "/usr/local/share/vim/ftplugin/gitsendemail.vim"
    }, {
      start: 487038,
      audio: 0,
      end: 489727,
      filename: "/usr/local/share/vim/ftplugin/j.vim"
    }, {
      start: 489727,
      audio: 0,
      end: 491444,
      filename: "/usr/local/share/vim/ftplugin/liquid.vim"
    }, {
      start: 491444,
      audio: 0,
      end: 492476,
      filename: "/usr/local/share/vim/ftplugin/verilog.vim"
    }, {
      start: 492476,
      audio: 0,
      end: 492575,
      filename: "/usr/local/share/vim/ftplugin/xs.vim"
    }, {
      start: 492575,
      audio: 0,
      end: 492860,
      filename: "/usr/local/share/vim/ftplugin/prolog.vim"
    }, {
      start: 492860,
      audio: 0,
      end: 493159,
      filename: "/usr/local/share/vim/ftplugin/procmail.vim"
    }, {
      start: 493159,
      audio: 0,
      end: 493418,
      filename: "/usr/local/share/vim/ftplugin/mailaliases.vim"
    }, {
      start: 493418,
      audio: 0,
      end: 494016,
      filename: "/usr/local/share/vim/ftplugin/tex.vim"
    }, {
      start: 494016,
      audio: 0,
      end: 494275,
      filename: "/usr/local/share/vim/ftplugin/gpg.vim"
    }, {
      start: 494275,
      audio: 0,
      end: 494570,
      filename: "/usr/local/share/vim/ftplugin/a2ps.vim"
    }, {
      start: 494570,
      audio: 0,
      end: 494703,
      filename: "/usr/local/share/vim/ftplugin/gdb.vim"
    }, {
      start: 494703,
      audio: 0,
      end: 495084,
      filename: "/usr/local/share/vim/ftplugin/kconfig.vim"
    }, {
      start: 495084,
      audio: 0,
      end: 495343,
      filename: "/usr/local/share/vim/ftplugin/dircolors.vim"
    }, {
      start: 495343,
      audio: 0,
      end: 495874,
      filename: "/usr/local/share/vim/ftplugin/plaintex.vim"
    }, {
      start: 495874,
      audio: 0,
      end: 496999,
      filename: "/usr/local/share/vim/ftplugin/perl6.vim"
    }, {
      start: 496999,
      audio: 0,
      end: 497258,
      filename: "/usr/local/share/vim/ftplugin/nanorc.vim"
    }, {
      start: 497258,
      audio: 0,
      end: 498356,
      filename: "/usr/local/share/vim/ftplugin/scheme.vim"
    }, {
      start: 498356,
      audio: 0,
      end: 499917,
      filename: "/usr/local/share/vim/ftplugin/vb.vim"
    }, {
      start: 499917,
      audio: 0,
      end: 501029,
      filename: "/usr/local/share/vim/ftplugin/hog.vim"
    }, {
      start: 501029,
      audio: 0,
      end: 501288,
      filename: "/usr/local/share/vim/ftplugin/udevperm.vim"
    }, {
      start: 501288,
      audio: 0,
      end: 501654,
      filename: "/usr/local/share/vim/ftplugin/csc.vim"
    }, {
      start: 501654,
      audio: 0,
      end: 503395,
      filename: "/usr/local/share/vim/ftplugin/gitrebase.vim"
    }, {
      start: 503395,
      audio: 0,
      end: 508798,
      filename: "/usr/local/share/vim/ftplugin/changelog.vim"
    }, {
      start: 508798,
      audio: 0,
      end: 508976,
      filename: "/usr/local/share/vim/ftplugin/text.vim"
    }, {
      start: 508976,
      audio: 0,
      end: 510625,
      filename: "/usr/local/share/vim/ftplugin/bzl.vim"
    }, {
      start: 510625,
      audio: 0,
      end: 511334,
      filename: "/usr/local/share/vim/ftplugin/lprolog.vim"
    }, {
      start: 511334,
      audio: 0,
      end: 511999,
      filename: "/usr/local/share/vim/ftplugin/occam.vim"
    }, {
      start: 511999,
      audio: 0,
      end: 523048,
      filename: "/usr/local/share/vim/ftplugin/ocaml.vim"
    }, {
      start: 523048,
      audio: 0,
      end: 525011,
      filename: "/usr/local/share/vim/ftplugin/abaqus.vim"
    }, {
      start: 525011,
      audio: 0,
      end: 525110,
      filename: "/usr/local/share/vim/ftplugin/sbt.vim"
    }, {
      start: 525110,
      audio: 0,
      end: 525941,
      filename: "/usr/local/share/vim/ftplugin/falcon.vim"
    }, {
      start: 525941,
      audio: 0,
      end: 526485,
      filename: "/usr/local/share/vim/ftplugin/r.vim"
    }, {
      start: 526485,
      audio: 0,
      end: 526578,
      filename: "/usr/local/share/vim/ftplugin/tmux.vim"
    }, {
      start: 526578,
      audio: 0,
      end: 526872,
      filename: "/usr/local/share/vim/ftplugin/xinetd.vim"
    }, {
      start: 526872,
      audio: 0,
      end: 527487,
      filename: "/usr/local/share/vim/ftplugin/svg.vim"
    }, {
      start: 527487,
      audio: 0,
      end: 527746,
      filename: "/usr/local/share/vim/ftplugin/grub.vim"
    }, {
      start: 527746,
      audio: 0,
      end: 528005,
      filename: "/usr/local/share/vim/ftplugin/alsaconf.vim"
    }, {
      start: 528005,
      audio: 0,
      end: 528069,
      filename: "/usr/local/share/vim/ftplugin/systemd.vim"
    }, {
      start: 528069,
      audio: 0,
      end: 529163,
      filename: "/usr/local/share/vim/ftplugin/nsis.vim"
    }, {
      start: 529163,
      audio: 0,
      end: 531051,
      filename: "/usr/local/share/vim/ftplugin/php.vim"
    }, {
      start: 531051,
      audio: 0,
      end: 531455,
      filename: "/usr/local/share/vim/ftplugin/dtrace.vim"
    }, {
      start: 531455,
      audio: 0,
      end: 531885,
      filename: "/usr/local/share/vim/ftplugin/gprof.vim"
    }, {
      start: 531885,
      audio: 0,
      end: 532500,
      filename: "/usr/local/share/vim/ftplugin/xsd.vim"
    }, {
      start: 532500,
      audio: 0,
      end: 532768,
      filename: "/usr/local/share/vim/ftplugin/logtalk.vim"
    }, {
      start: 532768,
      audio: 0,
      end: 533186,
      filename: "/usr/local/share/vim/ftplugin/vroom.vim"
    }, {
      start: 533186,
      audio: 0,
      end: 533561,
      filename: "/usr/local/share/vim/ftplugin/css.vim"
    }, {
      start: 533561,
      audio: 0,
      end: 533925,
      filename: "/usr/local/share/vim/ftplugin/cs.vim"
    }, {
      start: 533925,
      audio: 0,
      end: 534582,
      filename: "/usr/local/share/vim/ftplugin/rnoweb.vim"
    }, {
      start: 534582,
      audio: 0,
      end: 534732,
      filename: "/usr/local/share/vim/ftplugin/art.vim"
    }, {
      start: 534732,
      audio: 0,
      end: 534991,
      filename: "/usr/local/share/vim/ftplugin/dosini.vim"
    }, {
      start: 534991,
      audio: 0,
      end: 535415,
      filename: "/usr/local/share/vim/ftplugin/initex.vim"
    }, {
      start: 535415,
      audio: 0,
      end: 535824,
      filename: "/usr/local/share/vim/ftplugin/rhelp.vim"
    }, {
      start: 535824,
      audio: 0,
      end: 537875,
      filename: "/usr/local/share/vim/ftplugin/gitcommit.vim"
    }, {
      start: 537875,
      audio: 0,
      end: 538075,
      filename: "/usr/local/share/vim/ftplugin/gitconfig.vim"
    }, {
      start: 538075,
      audio: 0,
      end: 538334,
      filename: "/usr/local/share/vim/ftplugin/dictconf.vim"
    }, {
      start: 538334,
      audio: 0,
      end: 542833,
      filename: "/usr/local/share/vim/ftplugin/cucumber.vim"
    }, {
      start: 542833,
      audio: 0,
      end: 543085,
      filename: "/usr/local/share/vim/ftplugin/netrc.vim"
    }, {
      start: 543085,
      audio: 0,
      end: 543375,
      filename: "/usr/local/share/vim/ftplugin/xdefaults.vim"
    }, {
      start: 543375,
      audio: 0,
      end: 543860,
      filename: "/usr/local/share/vim/ftplugin/pyrex.vim"
    }, {
      start: 543860,
      audio: 0,
      end: 544507,
      filename: "/usr/local/share/vim/ftplugin/postscr.vim"
    }, {
      start: 544507,
      audio: 0,
      end: 545728,
      filename: "/usr/local/share/vim/ftplugin/c.vim"
    }, {
      start: 545728,
      audio: 0,
      end: 546401,
      filename: "/usr/local/share/vim/ftplugin/dtd.vim"
    }, {
      start: 546401,
      audio: 0,
      end: 546653,
      filename: "/usr/local/share/vim/ftplugin/passwd.vim"
    }, {
      start: 546653,
      audio: 0,
      end: 546790,
      filename: "/usr/local/share/vim/ftplugin/dune.vim"
    }, {
      start: 546790,
      audio: 0,
      end: 547032,
      filename: "/usr/local/share/vim/ftplugin/cfg.vim"
    }, {
      start: 547032,
      audio: 0,
      end: 547129,
      filename: "/usr/local/share/vim/ftplugin/htmldjango.vim"
    }, {
      start: 547129,
      audio: 0,
      end: 549259,
      filename: "/usr/local/share/vim/ftplugin/pdf.vim"
    }, {
      start: 549259,
      audio: 0,
      end: 549883,
      filename: "/usr/local/share/vim/ftplugin/sgml.vim"
    }, {
      start: 549883,
      audio: 0,
      end: 550376,
      filename: "/usr/local/share/vim/ftplugin/dosbatch.vim"
    }, {
      start: 550376,
      audio: 0,
      end: 550670,
      filename: "/usr/local/share/vim/ftplugin/modconf.vim"
    }, {
      start: 550670,
      audio: 0,
      end: 551266,
      filename: "/usr/local/share/vim/ftplugin/framescript.vim"
    }, {
      start: 551266,
      audio: 0,
      end: 551548,
      filename: "/usr/local/share/vim/ftplugin/yaml.vim"
    }, {
      start: 551548,
      audio: 0,
      end: 551685,
      filename: "/usr/local/share/vim/ftplugin/awk.vim"
    }, {
      start: 551685,
      audio: 0,
      end: 551808,
      filename: "/usr/local/share/vim/ftplugin/logcheck.vim"
    }, {
      start: 551808,
      audio: 0,
      end: 552004,
      filename: "/usr/local/share/vim/ftplugin/aap.vim"
    }, {
      start: 552004,
      audio: 0,
      end: 552263,
      filename: "/usr/local/share/vim/ftplugin/dictdconf.vim"
    }, {
      start: 552263,
      audio: 0,
      end: 552449,
      filename: "/usr/local/share/vim/ftplugin/jproperties.vim"
    }, {
      start: 552449,
      audio: 0,
      end: 553035,
      filename: "/usr/local/share/vim/ftplugin/kwt.vim"
    }, {
      start: 553035,
      audio: 0,
      end: 553326,
      filename: "/usr/local/share/vim/ftplugin/calendar.vim"
    }, {
      start: 553326,
      audio: 0,
      end: 553562,
      filename: "/usr/local/share/vim/ftplugin/cvsrc.vim"
    }, {
      start: 553562,
      audio: 0,
      end: 553845,
      filename: "/usr/local/share/vim/ftplugin/less.vim"
    }, {
      start: 553845,
      audio: 0,
      end: 554104,
      filename: "/usr/local/share/vim/ftplugin/libao.vim"
    }, {
      start: 554104,
      audio: 0,
      end: 554363,
      filename: "/usr/local/share/vim/ftplugin/rnc.vim"
    }, {
      start: 554363,
      audio: 0,
      end: 554622,
      filename: "/usr/local/share/vim/ftplugin/hostconf.vim"
    }, {
      start: 554622,
      audio: 0,
      end: 563323,
      filename: "/usr/local/share/vim/ftplugin/debchangelog.vim"
    }, {
      start: 563323,
      audio: 0,
      end: 563561,
      filename: "/usr/local/share/vim/ftplugin/qf.vim"
    }, {
      start: 563561,
      audio: 0,
      end: 565532,
      filename: "/usr/local/share/vim/ftplugin/clojure.vim"
    }, {
      start: 565532,
      audio: 0,
      end: 566820,
      filename: "/usr/local/share/vim/ftplugin/xhtml.vim"
    }, {
      start: 566820,
      audio: 0,
      end: 567079,
      filename: "/usr/local/share/vim/ftplugin/updatedb.vim"
    }, {
      start: 567079,
      audio: 0,
      end: 568174,
      filename: "/usr/local/share/vim/ftplugin/html.vim"
    }, {
      start: 568174,
      audio: 0,
      end: 568433,
      filename: "/usr/local/share/vim/ftplugin/protocols.vim"
    }, {
      start: 568433,
      audio: 0,
      end: 568692,
      filename: "/usr/local/share/vim/ftplugin/cdrdaoconf.vim"
    }, {
      start: 568692,
      audio: 0,
      end: 568878,
      filename: "/usr/local/share/vim/ftplugin/bst.vim"
    }, {
      start: 568878,
      audio: 0,
      end: 569391,
      filename: "/usr/local/share/vim/ftplugin/cmake.vim"
    }, {
      start: 569391,
      audio: 0,
      end: 569698,
      filename: "/usr/local/share/vim/ftplugin/help.vim"
    }, {
      start: 569698,
      audio: 0,
      end: 569957,
      filename: "/usr/local/share/vim/ftplugin/lftp.vim"
    }, {
      start: 569957,
      audio: 0,
      end: 570216,
      filename: "/usr/local/share/vim/ftplugin/setserial.vim"
    }, {
      start: 570216,
      audio: 0,
      end: 570475,
      filename: "/usr/local/share/vim/ftplugin/limits.vim"
    }, {
      start: 570475,
      audio: 0,
      end: 570734,
      filename: "/usr/local/share/vim/ftplugin/elinks.vim"
    }, {
      start: 570734,
      audio: 0,
      end: 571005,
      filename: "/usr/local/share/vim/ftplugin/slpspi.vim"
    }, {
      start: 571005,
      audio: 0,
      end: 571207,
      filename: "/usr/local/share/vim/ftplugin/go.vim"
    }, {
      start: 571207,
      audio: 0,
      end: 571707,
      filename: "/usr/local/share/vim/ftplugin/msmessages.vim"
    }, {
      start: 571707,
      audio: 0,
      end: 571966,
      filename: "/usr/local/share/vim/ftplugin/arch.vim"
    }, {
      start: 571966,
      audio: 0,
      end: 575757,
      filename: "/usr/local/share/vim/ftplugin/context.vim"
    }, {
      start: 575757,
      audio: 0,
      end: 576051,
      filename: "/usr/local/share/vim/ftplugin/mplayerconf.vim"
    }, {
      start: 576051,
      audio: 0,
      end: 576310,
      filename: "/usr/local/share/vim/ftplugin/udevrules.vim"
    }, {
      start: 576310,
      audio: 0,
      end: 576542,
      filename: "/usr/local/share/vim/ftplugin/meson.vim"
    }, {
      start: 576542,
      audio: 0,
      end: 576801,
      filename: "/usr/local/share/vim/ftplugin/pamconf.vim"
    }, {
      start: 576801,
      audio: 0,
      end: 577060,
      filename: "/usr/local/share/vim/ftplugin/screen.vim"
    }, {
      start: 577060,
      audio: 0,
      end: 577319,
      filename: "/usr/local/share/vim/ftplugin/hostsaccess.vim"
    }, {
      start: 577319,
      audio: 0,
      end: 577578,
      filename: "/usr/local/share/vim/ftplugin/udevconf.vim"
    }, {
      start: 577578,
      audio: 0,
      end: 582446,
      filename: "/usr/local/share/vim/ftplugin/man.vim"
    }, {
      start: 582446,
      audio: 0,
      end: 583150,
      filename: "/usr/local/share/vim/ftplugin/sh.vim"
    }, {
      start: 583150,
      audio: 0,
      end: 583435,
      filename: "/usr/local/share/vim/ftplugin/sieve.vim"
    }, {
      start: 583435,
      audio: 0,
      end: 583740,
      filename: "/usr/local/share/vim/ftplugin/neomuttrc.vim"
    }, {
      start: 583740,
      audio: 0,
      end: 584459,
      filename: "/usr/local/share/vim/ftplugin/flexwiki.vim"
    }, {
      start: 584459,
      audio: 0,
      end: 592240,
      filename: "/usr/local/share/vim/ftplugin/cobol.vim"
    }, {
      start: 592240,
      audio: 0,
      end: 593290,
      filename: "/usr/local/share/vim/ftplugin/hamster.vim"
    }, {
      start: 593290,
      audio: 0,
      end: 593516,
      filename: "/usr/local/share/vim/plugin/tohtml.vim"
    }, {
      start: 593516,
      audio: 0,
      end: 593707,
      filename: "/usr/local/share/vim/plugin/spellfile.vim"
    }, {
      start: 593707,
      audio: 0,
      end: 598121,
      filename: "/usr/local/share/vim/plugin/logiPat.vim"
    }, {
      start: 598121,
      audio: 0,
      end: 598894,
      filename: "/usr/local/share/vim/plugin/rrhelper.vim"
    }, {
      start: 598894,
      audio: 0,
      end: 604290,
      filename: "/usr/local/share/vim/plugin/netrwPlugin.vim"
    }, {
      start: 604290,
      audio: 0,
      end: 606220,
      filename: "/usr/local/share/vim/plugin/vimballPlugin.vim"
    }, {
      start: 606220,
      audio: 0,
      end: 610375,
      filename: "/usr/local/share/vim/plugin/matchparen.vim"
    }, {
      start: 610375,
      audio: 0,
      end: 611774,
      filename: "/usr/local/share/vim/plugin/tarPlugin.vim"
    }, {
      start: 611774,
      audio: 0,
      end: 612301,
      filename: "/usr/local/share/vim/plugin/getscriptPlugin.vim"
    }, {
      start: 612301,
      audio: 0,
      end: 614249,
      filename: "/usr/local/share/vim/plugin/gzip.vim"
    }, {
      start: 614249,
      audio: 0,
      end: 614704,
      filename: "/usr/local/share/vim/plugin/manpager.vim"
    }, {
      start: 614704,
      audio: 0,
      end: 615807,
      filename: "/usr/local/share/vim/plugin/zipPlugin.vim"
    }, {
      start: 615807,
      audio: 0,
      end: 639129,
      filename: "/usr/local/share/vim/colors/onedark.vim"
    }, {
      start: 639129,
      audio: 0,
      end: 647465,
      filename: "/usr/local/share/vim/colors/monokai.vim"
    }, {
      start: 647465,
      audio: 0,
      end: 660921,
      filename: "/usr/local/share/vim/autoload/vimball.vim"
    }, {
      start: 660921,
      audio: 0,
      end: 681800,
      filename: "/usr/local/share/vim/autoload/tohtml.vim"
    }, {
      start: 681800,
      audio: 0,
      end: 689756,
      filename: "/usr/local/share/vim/autoload/rust.vim"
    }, {
      start: 689756,
      audio: 0,
      end: 690153,
      filename: "/usr/local/share/vim/autoload/contextcomplete.vim"
    }, {
      start: 690153,
      audio: 0,
      end: 703407,
      filename: "/usr/local/share/vim/autoload/tar.vim"
    }, {
      start: 703407,
      audio: 0,
      end: 719967,
      filename: "/usr/local/share/vim/autoload/htmlcomplete.vim"
    }, {
      start: 719967,
      audio: 0,
      end: 729572,
      filename: "/usr/local/share/vim/autoload/syntaxcomplete.vim"
    }, {
      start: 729572,
      audio: 0,
      end: 737251,
      filename: "/usr/local/share/vim/autoload/zip.vim"
    }, {
      start: 737251,
      audio: 0,
      end: 741449,
      filename: "/usr/local/share/vim/autoload/spellfile.vim"
    }, {
      start: 741449,
      audio: 0,
      end: 757515,
      filename: "/usr/local/share/vim/autoload/ada.vim"
    }, {
      start: 757515,
      audio: 0,
      end: 771122,
      filename: "/usr/local/share/vim/autoload/python3complete.vim"
    }, {
      start: 771122,
      audio: 0,
      end: 772819,
      filename: "/usr/local/share/vim/autoload/adacomplete.vim"
    }, {
      start: 772819,
      audio: 0,
      end: 780356,
      filename: "/usr/local/share/vim/autoload/clojurecomplete.vim"
    }, {
      start: 780356,
      audio: 0,
      end: 794606,
      filename: "/usr/local/share/vim/autoload/sqlcomplete.vim"
    }, {
      start: 794606,
      audio: 0,
      end: 794787,
      filename: "/usr/local/share/vim/autoload/netrw_gitignore.vim"
    }, {
      start: 794787,
      audio: 0,
      end: 817421,
      filename: "/usr/local/share/vim/autoload/javascriptcomplete.vim"
    }, {
      start: 817421,
      audio: 0,
      end: 855825,
      filename: "/usr/local/share/vim/autoload/csscomplete.vim"
    }, {
      start: 855825,
      audio: 0,
      end: 1113657,
      filename: "/usr/local/share/vim/autoload/netrw.vim"
    }, {
      start: 1113657,
      audio: 0,
      end: 1114036,
      filename: "/usr/local/share/vim/autoload/paste.vim"
    }, {
      start: 1114036,
      audio: 0,
      end: 1127886,
      filename: "/usr/local/share/vim/autoload/pythoncomplete.vim"
    }, {
      start: 1127886,
      audio: 0,
      end: 1132204,
      filename: "/usr/local/share/vim/autoload/netrwFileHandlers.vim"
    }, {
      start: 1132204,
      audio: 0,
      end: 1135290,
      filename: "/usr/local/share/vim/autoload/xmlformat.vim"
    }, {
      start: 1135290,
      audio: 0,
      end: 1226509,
      filename: "/usr/local/share/vim/autoload/haskellcomplete.vim"
    }, {
      start: 1226509,
      audio: 0,
      end: 1236882,
      filename: "/usr/local/share/vim/autoload/xmlcomplete.vim"
    }, {
      start: 1236882,
      audio: 0,
      end: 1238179,
      filename: "/usr/local/share/vim/autoload/decada.vim"
    }, {
      start: 1238179,
      audio: 0,
      end: 1240474,
      filename: "/usr/local/share/vim/autoload/rustfmt.vim"
    }, {
      start: 1240474,
      audio: 0,
      end: 1243913,
      filename: "/usr/local/share/vim/autoload/gzip.vim"
    }, {
      start: 1243913,
      audio: 0,
      end: 1247044,
      filename: "/usr/local/share/vim/autoload/gnat.vim"
    }, {
      start: 1247044,
      audio: 0,
      end: 1257944,
      filename: "/usr/local/share/vim/autoload/ccomplete.vim"
    }, {
      start: 1257944,
      audio: 0,
      end: 1259364,
      filename: "/usr/local/share/vim/autoload/RstFold.vim"
    }, {
      start: 1259364,
      audio: 0,
      end: 1270773,
      filename: "/usr/local/share/vim/autoload/getscript.vim"
    }, {
      start: 1270773,
      audio: 0,
      end: 1275152,
      filename: "/usr/local/share/vim/autoload/context.vim"
    }, {
      start: 1275152,
      audio: 0,
      end: 1283545,
      filename: "/usr/local/share/vim/autoload/netrwSettings.vim"
    }, {
      start: 1283545,
      audio: 0,
      end: 1360471,
      filename: "/usr/local/share/vim/autoload/phpcomplete.vim"
    }, {
      start: 1360471,
      audio: 0,
      end: 1380630,
      filename: "/usr/local/share/vim/autoload/rubycomplete.vim"
    }, {
      start: 1380630,
      audio: 0,
      end: 1392756,
      filename: "/usr/local/share/vim/autoload/dist/ft.vim"
    }, {
      start: 1392756,
      audio: 0,
      end: 1397229,
      filename: "/usr/local/share/vim/autoload/xml/xsl.vim"
    }, {
      start: 1397229,
      audio: 0,
      end: 1438767,
      filename: "/usr/local/share/vim/autoload/xml/html401s.vim"
    }, {
      start: 1438767,
      audio: 0,
      end: 1443513,
      filename: "/usr/local/share/vim/autoload/xml/xsd.vim"
    }, {
      start: 1443513,
      audio: 0,
      end: 1491662,
      filename: "/usr/local/share/vim/autoload/xml/xhtml11.vim"
    }, {
      start: 1491662,
      audio: 0,
      end: 1491693,
      filename: "/usr/local/share/vim/syntax/javascriptreact.vim"
    }, {
      start: 1491693,
      audio: 0,
      end: 1495674,
      filename: "/usr/local/share/vim/syntax/raml.vim"
    }, {
      start: 1495674,
      audio: 0,
      end: 1501397,
      filename: "/usr/local/share/vim/syntax/cmod.vim"
    }, {
      start: 1501397,
      audio: 0,
      end: 1507334,
      filename: "/usr/local/share/vim/syntax/mma.vim"
    }, {
      start: 1507334,
      audio: 0,
      end: 1510398,
      filename: "/usr/local/share/vim/syntax/autodoc.vim"
    }, {
      start: 1510398,
      audio: 0,
      end: 1538029,
      filename: "/usr/local/share/vim/syntax/8th.vim"
    }, {
      start: 1538029,
      audio: 0,
      end: 1539813,
      filename: "/usr/local/share/vim/syntax/sd.vim"
    }, {
      start: 1539813,
      audio: 0,
      end: 1541032,
      filename: "/usr/local/share/vim/syntax/config.vim"
    }, {
      start: 1541032,
      audio: 0,
      end: 1543291,
      filename: "/usr/local/share/vim/syntax/cuda.vim"
    }, {
      start: 1543291,
      audio: 0,
      end: 1543370,
      filename: "/usr/local/share/vim/syntax/groff.vim"
    }, {
      start: 1543370,
      audio: 0,
      end: 1555937,
      filename: "/usr/local/share/vim/syntax/pascal.vim"
    }, {
      start: 1555937,
      audio: 0,
      end: 1584379,
      filename: "/usr/local/share/vim/syntax/fortran.vim"
    }, {
      start: 1584379,
      audio: 0,
      end: 1591247,
      filename: "/usr/local/share/vim/syntax/nastran.vim"
    }, {
      start: 1591247,
      audio: 0,
      end: 1592716,
      filename: "/usr/local/share/vim/syntax/abc.vim"
    }, {
      start: 1592716,
      audio: 0,
      end: 1593323,
      filename: "/usr/local/share/vim/syntax/cvs.vim"
    }, {
      start: 1593323,
      audio: 0,
      end: 1616197,
      filename: "/usr/local/share/vim/syntax/aml.vim"
    }, {
      start: 1616197,
      audio: 0,
      end: 1619185,
      filename: "/usr/local/share/vim/syntax/slang.vim"
    }, {
      start: 1619185,
      audio: 0,
      end: 1621622,
      filename: "/usr/local/share/vim/syntax/hex.vim"
    }, {
      start: 1621622,
      audio: 0,
      end: 1623983,
      filename: "/usr/local/share/vim/syntax/sqlj.vim"
    }, {
      start: 1623983,
      audio: 0,
      end: 1636900,
      filename: "/usr/local/share/vim/syntax/asm68k.vim"
    }, {
      start: 1636900,
      audio: 0,
      end: 1677368,
      filename: "/usr/local/share/vim/syntax/sqlanywhere.vim"
    }, {
      start: 1677368,
      audio: 0,
      end: 1679005,
      filename: "/usr/local/share/vim/syntax/debsources.vim"
    }, {
      start: 1679005,
      audio: 0,
      end: 1689681,
      filename: "/usr/local/share/vim/syntax/tcsh.vim"
    }, {
      start: 1689681,
      audio: 0,
      end: 1689724,
      filename: "/usr/local/share/vim/syntax/chaskell.vim"
    }, {
      start: 1689724,
      audio: 0,
      end: 1690550,
      filename: "/usr/local/share/vim/syntax/colortest.vim"
    }, {
      start: 1690550,
      audio: 0,
      end: 1701422,
      filename: "/usr/local/share/vim/syntax/lscript.vim"
    }, {
      start: 1701422,
      audio: 0,
      end: 1718176,
      filename: "/usr/local/share/vim/syntax/ratpoison.vim"
    }, {
      start: 1718176,
      audio: 0,
      end: 1721994,
      filename: "/usr/local/share/vim/syntax/rmd.vim"
    }, {
      start: 1721994,
      audio: 0,
      end: 1726319,
      filename: "/usr/local/share/vim/syntax/abel.vim"
    }, {
      start: 1726319,
      audio: 0,
      end: 1727548,
      filename: "/usr/local/share/vim/syntax/rtf.vim"
    }, {
      start: 1727548,
      audio: 0,
      end: 1741959,
      filename: "/usr/local/share/vim/syntax/eterm.vim"
    }, {
      start: 1741959,
      audio: 0,
      end: 1747205,
      filename: "/usr/local/share/vim/syntax/verilogams.vim"
    }, {
      start: 1747205,
      audio: 0,
      end: 1751941,
      filename: "/usr/local/share/vim/syntax/javascript.vim"
    }, {
      start: 1751941,
      audio: 0,
      end: 1755912,
      filename: "/usr/local/share/vim/syntax/lss.vim"
    }, {
      start: 1755912,
      audio: 0,
      end: 1780630,
      filename: "/usr/local/share/vim/syntax/skill.vim"
    }, {
      start: 1780630,
      audio: 0,
      end: 1787187,
      filename: "/usr/local/share/vim/syntax/aspvbs.vim"
    }, {
      start: 1787187,
      audio: 0,
      end: 1792996,
      filename: "/usr/local/share/vim/syntax/nroff.vim"
    }, {
      start: 1792996,
      audio: 0,
      end: 1793957,
      filename: "/usr/local/share/vim/syntax/model.vim"
    }, {
      start: 1793957,
      audio: 0,
      end: 1795794,
      filename: "/usr/local/share/vim/syntax/xslt.vim"
    }, {
      start: 1795794,
      audio: 0,
      end: 1800240,
      filename: "/usr/local/share/vim/syntax/cabal.vim"
    }, {
      start: 1800240,
      audio: 0,
      end: 1821844,
      filename: "/usr/local/share/vim/syntax/fvwm.vim"
    }, {
      start: 1821844,
      audio: 0,
      end: 1827988,
      filename: "/usr/local/share/vim/syntax/reva.vim"
    }, {
      start: 1827988,
      audio: 0,
      end: 1842491,
      filename: "/usr/local/share/vim/syntax/apache.vim"
    }, {
      start: 1842491,
      audio: 0,
      end: 1851216,
      filename: "/usr/local/share/vim/syntax/rc.vim"
    }, {
      start: 1851216,
      audio: 0,
      end: 1852239,
      filename: "/usr/local/share/vim/syntax/ave.vim"
    }, {
      start: 1852239,
      audio: 0,
      end: 1853222,
      filename: "/usr/local/share/vim/syntax/takcmp.vim"
    }, {
      start: 1853222,
      audio: 0,
      end: 1856156,
      filename: "/usr/local/share/vim/syntax/matlab.vim"
    }, {
      start: 1856156,
      audio: 0,
      end: 1861573,
      filename: "/usr/local/share/vim/syntax/ant.vim"
    }, {
      start: 1861573,
      audio: 0,
      end: 1862833,
      filename: "/usr/local/share/vim/syntax/cheetah.vim"
    }, {
      start: 1862833,
      audio: 0,
      end: 1863776,
      filename: "/usr/local/share/vim/syntax/dirpager.vim"
    }, {
      start: 1863776,
      audio: 0,
      end: 1864483,
      filename: "/usr/local/share/vim/syntax/dsl.vim"
    }, {
      start: 1864483,
      audio: 0,
      end: 1870509,
      filename: "/usr/local/share/vim/syntax/omnimark.vim"
    }, {
      start: 1870509,
      audio: 0,
      end: 1875241,
      filename: "/usr/local/share/vim/syntax/xml.vim"
    }, {
      start: 1875241,
      audio: 0,
      end: 1875309,
      filename: "/usr/local/share/vim/syntax/vue.vim"
    }, {
      start: 1875309,
      audio: 0,
      end: 1883776,
      filename: "/usr/local/share/vim/syntax/readline.vim"
    }, {
      start: 1883776,
      audio: 0,
      end: 1887554,
      filename: "/usr/local/share/vim/syntax/pccts.vim"
    }, {
      start: 1887554,
      audio: 0,
      end: 1889078,
      filename: "/usr/local/share/vim/syntax/sgmldecl.vim"
    }, {
      start: 1889078,
      audio: 0,
      end: 1905564,
      filename: "/usr/local/share/vim/syntax/sicad.vim"
    }, {
      start: 1905564,
      audio: 0,
      end: 1905857,
      filename: "/usr/local/share/vim/syntax/ctrlh.vim"
    }, {
      start: 1905857,
      audio: 0,
      end: 1908624,
      filename: "/usr/local/share/vim/syntax/initng.vim"
    }, {
      start: 1908624,
      audio: 0,
      end: 1914467,
      filename: "/usr/local/share/vim/syntax/natural.vim"
    }, {
      start: 1914467,
      audio: 0,
      end: 1918564,
      filename: "/usr/local/share/vim/syntax/spyce.vim"
    }, {
      start: 1918564,
      audio: 0,
      end: 1919411,
      filename: "/usr/local/share/vim/syntax/hastepreproc.vim"
    }, {
      start: 1919411,
      audio: 0,
      end: 1921719,
      filename: "/usr/local/share/vim/syntax/hitest.vim"
    }, {
      start: 1921719,
      audio: 0,
      end: 1923693,
      filename: "/usr/local/share/vim/syntax/ayacc.vim"
    }, {
      start: 1923693,
      audio: 0,
      end: 1944955,
      filename: "/usr/local/share/vim/syntax/nasm.vim"
    }, {
      start: 1944955,
      audio: 0,
      end: 1945836,
      filename: "/usr/local/share/vim/syntax/hgcommit.vim"
    }, {
      start: 1945836,
      audio: 0,
      end: 1947412,
      filename: "/usr/local/share/vim/syntax/lotos.vim"
    }, {
      start: 1947412,
      audio: 0,
      end: 1963424,
      filename: "/usr/local/share/vim/syntax/java.vim"
    }, {
      start: 1963424,
      audio: 0,
      end: 1971868,
      filename: "/usr/local/share/vim/syntax/moo.vim"
    }, {
      start: 1971868,
      audio: 0,
      end: 1972988,
      filename: "/usr/local/share/vim/syntax/mmp.vim"
    }, {
      start: 1972988,
      audio: 0,
      end: 1975346,
      filename: "/usr/local/share/vim/syntax/z8a.vim"
    }, {
      start: 1975346,
      audio: 0,
      end: 1981361,
      filename: "/usr/local/share/vim/syntax/sass.vim"
    }, {
      start: 1981361,
      audio: 0,
      end: 1993923,
      filename: "/usr/local/share/vim/syntax/rust.vim"
    }, {
      start: 1993923,
      audio: 0,
      end: 1999608,
      filename: "/usr/local/share/vim/syntax/sdl.vim"
    }, {
      start: 1999608,
      audio: 0,
      end: 2004890,
      filename: "/usr/local/share/vim/syntax/tasm.vim"
    }, {
      start: 2004890,
      audio: 0,
      end: 2015900,
      filename: "/usr/local/share/vim/syntax/rexx.vim"
    }, {
      start: 2015900,
      audio: 0,
      end: 2017913,
      filename: "/usr/local/share/vim/syntax/gedcom.vim"
    }, {
      start: 2017913,
      audio: 0,
      end: 2019876,
      filename: "/usr/local/share/vim/syntax/jsp.vim"
    }, {
      start: 2019876,
      audio: 0,
      end: 2021899,
      filename: "/usr/local/share/vim/syntax/prescribe.vim"
    }, {
      start: 2021899,
      audio: 0,
      end: 2023946,
      filename: "/usr/local/share/vim/syntax/ppwiz.vim"
    }, {
      start: 2023946,
      audio: 0,
      end: 2026506,
      filename: "/usr/local/share/vim/syntax/fetchmail.vim"
    }, {
      start: 2026506,
      audio: 0,
      end: 2029005,
      filename: "/usr/local/share/vim/syntax/gp.vim"
    }, {
      start: 2029005,
      audio: 0,
      end: 2029746,
      filename: "/usr/local/share/vim/syntax/viminfo.vim"
    }, {
      start: 2029746,
      audio: 0,
      end: 2032208,
      filename: "/usr/local/share/vim/syntax/obj.vim"
    }, {
      start: 2032208,
      audio: 0,
      end: 2035224,
      filename: "/usr/local/share/vim/syntax/sinda.vim"
    }, {
      start: 2035224,
      audio: 0,
      end: 2043057,
      filename: "/usr/local/share/vim/syntax/conaryrecipe.vim"
    }, {
      start: 2043057,
      audio: 0,
      end: 2047305,
      filename: "/usr/local/share/vim/syntax/tads.vim"
    }, {
      start: 2047305,
      audio: 0,
      end: 2047709,
      filename: "/usr/local/share/vim/syntax/sql.vim"
    }, {
      start: 2047709,
      audio: 0,
      end: 2049094,
      filename: "/usr/local/share/vim/syntax/javacc.vim"
    }, {
      start: 2049094,
      audio: 0,
      end: 2051180,
      filename: "/usr/local/share/vim/syntax/chicken.vim"
    }, {
      start: 2051180,
      audio: 0,
      end: 2051331,
      filename: "/usr/local/share/vim/syntax/bash.vim"
    }, {
      start: 2051331,
      audio: 0,
      end: 2053463,
      filename: "/usr/local/share/vim/syntax/st.vim"
    }, {
      start: 2053463,
      audio: 0,
      end: 2058836,
      filename: "/usr/local/share/vim/syntax/po.vim"
    }, {
      start: 2058836,
      audio: 0,
      end: 2076513,
      filename: "/usr/local/share/vim/syntax/exim.vim"
    }, {
      start: 2076513,
      audio: 0,
      end: 2085108,
      filename: "/usr/local/share/vim/syntax/named.vim"
    }, {
      start: 2085108,
      audio: 0,
      end: 2088841,
      filename: "/usr/local/share/vim/syntax/tap.vim"
    }, {
      start: 2088841,
      audio: 0,
      end: 2090691,
      filename: "/usr/local/share/vim/syntax/registry.vim"
    }, {
      start: 2090691,
      audio: 0,
      end: 2092823,
      filename: "/usr/local/share/vim/syntax/uil.vim"
    }, {
      start: 2092823,
      audio: 0,
      end: 2122995,
      filename: "/usr/local/share/vim/syntax/doxygen.vim"
    }, {
      start: 2122995,
      audio: 0,
      end: 2125844,
      filename: "/usr/local/share/vim/syntax/bdf.vim"
    }, {
      start: 2125844,
      audio: 0,
      end: 2126498,
      filename: "/usr/local/share/vim/syntax/ecd.vim"
    }, {
      start: 2126498,
      audio: 0,
      end: 2137300,
      filename: "/usr/local/share/vim/syntax/spec.vim"
    }, {
      start: 2137300,
      audio: 0,
      end: 2137838,
      filename: "/usr/local/share/vim/syntax/master.vim"
    }, {
      start: 2137838,
      audio: 0,
      end: 2143992,
      filename: "/usr/local/share/vim/syntax/haskell.vim"
    }, {
      start: 2143992,
      audio: 0,
      end: 2149703,
      filename: "/usr/local/share/vim/syntax/tidy.vim"
    }, {
      start: 2149703,
      audio: 0,
      end: 2149919,
      filename: "/usr/local/share/vim/syntax/tt2html.vim"
    }, {
      start: 2149919,
      audio: 0,
      end: 2155574,
      filename: "/usr/local/share/vim/syntax/lifelines.vim"
    }, {
      start: 2155574,
      audio: 0,
      end: 2161431,
      filename: "/usr/local/share/vim/syntax/lex.vim"
    }, {
      start: 2161431,
      audio: 0,
      end: 2163959,
      filename: "/usr/local/share/vim/syntax/srec.vim"
    }, {
      start: 2163959,
      audio: 0,
      end: 2164674,
      filename: "/usr/local/share/vim/syntax/def.vim"
    }, {
      start: 2164674,
      audio: 0,
      end: 2164938,
      filename: "/usr/local/share/vim/syntax/tar.vim"
    }, {
      start: 2164938,
      audio: 0,
      end: 2165228,
      filename: "/usr/local/share/vim/syntax/change.vim"
    }, {
      start: 2165228,
      audio: 0,
      end: 2167574,
      filename: "/usr/local/share/vim/syntax/tsscl.vim"
    }, {
      start: 2167574,
      audio: 0,
      end: 2180071,
      filename: "/usr/local/share/vim/syntax/mush.vim"
    }, {
      start: 2180071,
      audio: 0,
      end: 2189579,
      filename: "/usr/local/share/vim/syntax/docbk.vim"
    }, {
      start: 2189579,
      audio: 0,
      end: 2203610,
      filename: "/usr/local/share/vim/syntax/xf86conf.vim"
    }, {
      start: 2203610,
      audio: 0,
      end: 2210292,
      filename: "/usr/local/share/vim/syntax/fgl.vim"
    }, {
      start: 2210292,
      audio: 0,
      end: 2216564,
      filename: "/usr/local/share/vim/syntax/squid.vim"
    }, {
      start: 2216564,
      audio: 0,
      end: 2226626,
      filename: "/usr/local/share/vim/syntax/virata.vim"
    }, {
      start: 2226626,
      audio: 0,
      end: 2227356,
      filename: "/usr/local/share/vim/syntax/cweb.vim"
    }, {
      start: 2227356,
      audio: 0,
      end: 2228656,
      filename: "/usr/local/share/vim/syntax/services.vim"
    }, {
      start: 2228656,
      audio: 0,
      end: 2234044,
      filename: "/usr/local/share/vim/syntax/tt2.vim"
    }, {
      start: 2234044,
      audio: 0,
      end: 2241200,
      filename: "/usr/local/share/vim/syntax/vmasm.vim"
    }, {
      start: 2241200,
      audio: 0,
      end: 2242186,
      filename: "/usr/local/share/vim/syntax/grads.vim"
    }, {
      start: 2242186,
      audio: 0,
      end: 2246701,
      filename: "/usr/local/share/vim/syntax/sqlinformix.vim"
    }, {
      start: 2246701,
      audio: 0,
      end: 2247462,
      filename: "/usr/local/share/vim/syntax/dylanintr.vim"
    }, {
      start: 2247462,
      audio: 0,
      end: 2253474,
      filename: "/usr/local/share/vim/syntax/zimbu.vim"
    }, {
      start: 2253474,
      audio: 0,
      end: 2260378,
      filename: "/usr/local/share/vim/syntax/haml.vim"
    }, {
      start: 2260378,
      audio: 0,
      end: 2260821,
      filename: "/usr/local/share/vim/syntax/blank.vim"
    }, {
      start: 2260821,
      audio: 0,
      end: 2261195,
      filename: "/usr/local/share/vim/syntax/scss.vim"
    }, {
      start: 2261195,
      audio: 0,
      end: 2323402,
      filename: "/usr/local/share/vim/syntax/muttrc.vim"
    }, {
      start: 2323402,
      audio: 0,
      end: 2326306,
      filename: "/usr/local/share/vim/syntax/loginaccess.vim"
    }, {
      start: 2326306,
      audio: 0,
      end: 2353715,
      filename: "/usr/local/share/vim/syntax/xmodmap.vim"
    }, {
      start: 2353715,
      audio: 0,
      end: 2355366,
      filename: "/usr/local/share/vim/syntax/strace.vim"
    }, {
      start: 2355366,
      audio: 0,
      end: 2355688,
      filename: "/usr/local/share/vim/syntax/dylanlid.vim"
    }, {
      start: 2355688,
      audio: 0,
      end: 2369547,
      filename: "/usr/local/share/vim/syntax/tcl.vim"
    }, {
      start: 2369547,
      audio: 0,
      end: 2374487,
      filename: "/usr/local/share/vim/syntax/bib.vim"
    }, {
      start: 2374487,
      audio: 0,
      end: 2378773,
      filename: "/usr/local/share/vim/syntax/racc.vim"
    }, {
      start: 2378773,
      audio: 0,
      end: 2379303,
      filename: "/usr/local/share/vim/syntax/dockerfile.vim"
    }, {
      start: 2379303,
      audio: 0,
      end: 2418786,
      filename: "/usr/local/share/vim/syntax/objc.vim"
    }, {
      start: 2418786,
      audio: 0,
      end: 2419751,
      filename: "/usr/local/share/vim/syntax/plp.vim"
    }, {
      start: 2419751,
      audio: 0,
      end: 2420189,
      filename: "/usr/local/share/vim/syntax/conf.vim"
    }, {
      start: 2420189,
      audio: 0,
      end: 2453764,
      filename: "/usr/local/share/vim/syntax/lisp.vim"
    }, {
      start: 2453764,
      audio: 0,
      end: 2455357,
      filename: "/usr/local/share/vim/syntax/snnspat.vim"
    }, {
      start: 2455357,
      audio: 0,
      end: 2461550,
      filename: "/usr/local/share/vim/syntax/voscm.vim"
    }, {
      start: 2461550,
      audio: 0,
      end: 2465242,
      filename: "/usr/local/share/vim/syntax/gitolite.vim"
    }, {
      start: 2465242,
      audio: 0,
      end: 2466111,
      filename: "/usr/local/share/vim/syntax/debcopyright.vim"
    }, {
      start: 2466111,
      audio: 0,
      end: 2558453,
      filename: "/usr/local/share/vim/syntax/pfmain.vim"
    }, {
      start: 2558453,
      audio: 0,
      end: 2561639,
      filename: "/usr/local/share/vim/syntax/systemverilog.vim"
    }, {
      start: 2561639,
      audio: 0,
      end: 2585943,
      filename: "/usr/local/share/vim/syntax/rpl.vim"
    }, {
      start: 2585943,
      audio: 0,
      end: 2621434,
      filename: "/usr/local/share/vim/syntax/typescriptcommon.vim"
    }, {
      start: 2621434,
      audio: 0,
      end: 2627410,
      filename: "/usr/local/share/vim/syntax/chill.vim"
    }, {
      start: 2627410,
      audio: 0,
      end: 2660737,
      filename: "/usr/local/share/vim/syntax/perl.vim"
    }, {
      start: 2660737,
      audio: 0,
      end: 2663992,
      filename: "/usr/local/share/vim/syntax/terminfo.vim"
    }, {
      start: 2663992,
      audio: 0,
      end: 2674422,
      filename: "/usr/local/share/vim/syntax/scala.vim"
    }, {
      start: 2674422,
      audio: 0,
      end: 2683837,
      filename: "/usr/local/share/vim/syntax/dnsmasq.vim"
    }, {
      start: 2683837,
      audio: 0,
      end: 2686097,
      filename: "/usr/local/share/vim/syntax/dot.vim"
    }, {
      start: 2686097,
      audio: 0,
      end: 2694520,
      filename: "/usr/local/share/vim/syntax/mrxvtrc.vim"
    }, {
      start: 2694520,
      audio: 0,
      end: 2695973,
      filename: "/usr/local/share/vim/syntax/modula3.vim"
    }, {
      start: 2695973,
      audio: 0,
      end: 2699268,
      filename: "/usr/local/share/vim/syntax/manconf.vim"
    }, {
      start: 2699268,
      audio: 0,
      end: 2702253,
      filename: "/usr/local/share/vim/syntax/cpp.vim"
    }, {
      start: 2702253,
      audio: 0,
      end: 2704231,
      filename: "/usr/local/share/vim/syntax/asteriskvm.vim"
    }, {
      start: 2704231,
      audio: 0,
      end: 2704610,
      filename: "/usr/local/share/vim/syntax/htmlm4.vim"
    }, {
      start: 2704610,
      audio: 0,
      end: 2714639,
      filename: "/usr/local/share/vim/syntax/sshconfig.vim"
    }, {
      start: 2714639,
      audio: 0,
      end: 2753310,
      filename: "/usr/local/share/vim/syntax/ruby.vim"
    }, {
      start: 2753310,
      audio: 0,
      end: 2754067,
      filename: "/usr/local/share/vim/syntax/vgrindefs.vim"
    }, {
      start: 2754067,
      audio: 0,
      end: 2756509,
      filename: "/usr/local/share/vim/syntax/ld.vim"
    }, {
      start: 2756509,
      audio: 0,
      end: 2759600,
      filename: "/usr/local/share/vim/syntax/jovial.vim"
    }, {
      start: 2759600,
      audio: 0,
      end: 2766385,
      filename: "/usr/local/share/vim/syntax/ada.vim"
    }, {
      start: 2766385,
      audio: 0,
      end: 2786797,
      filename: "/usr/local/share/vim/syntax/zsh.vim"
    }, {
      start: 2786797,
      audio: 0,
      end: 2789821,
      filename: "/usr/local/share/vim/syntax/xpm2.vim"
    }, {
      start: 2789821,
      audio: 0,
      end: 2791795,
      filename: "/usr/local/share/vim/syntax/modula2.vim"
    }, {
      start: 2791795,
      audio: 0,
      end: 2794048,
      filename: "/usr/local/share/vim/syntax/upstart.vim"
    }, {
      start: 2794048,
      audio: 0,
      end: 2807045,
      filename: "/usr/local/share/vim/syntax/idlang.vim"
    }, {
      start: 2807045,
      audio: 0,
      end: 2810398,
      filename: "/usr/local/share/vim/syntax/lace.vim"
    }, {
      start: 2810398,
      audio: 0,
      end: 2818019,
      filename: "/usr/local/share/vim/syntax/quake.vim"
    }, {
      start: 2818019,
      audio: 0,
      end: 2850024,
      filename: "/usr/local/share/vim/syntax/sas.vim"
    }, {
      start: 2850024,
      audio: 0,
      end: 2854029,
      filename: "/usr/local/share/vim/syntax/trasys.vim"
    }, {
      start: 2854029,
      audio: 0,
      end: 2862434,
      filename: "/usr/local/share/vim/syntax/abap.vim"
    }, {
      start: 2862434,
      audio: 0,
      end: 2870954,
      filename: "/usr/local/share/vim/syntax/ia64.vim"
    }, {
      start: 2870954,
      audio: 0,
      end: 2872203,
      filename: "/usr/local/share/vim/syntax/exports.vim"
    }, {
      start: 2872203,
      audio: 0,
      end: 2875536,
      filename: "/usr/local/share/vim/syntax/json.vim"
    }, {
      start: 2875536,
      audio: 0,
      end: 2879606,
      filename: "/usr/local/share/vim/syntax/lite.vim"
    }, {
      start: 2879606,
      audio: 0,
      end: 2882413,
      filename: "/usr/local/share/vim/syntax/automake.vim"
    }, {
      start: 2882413,
      audio: 0,
      end: 2890218,
      filename: "/usr/local/share/vim/syntax/vhdl.vim"
    }, {
      start: 2890218,
      audio: 0,
      end: 2892528,
      filename: "/usr/local/share/vim/syntax/treetop.vim"
    }, {
      start: 2892528,
      audio: 0,
      end: 2893579,
      filename: "/usr/local/share/vim/syntax/bzr.vim"
    }, {
      start: 2893579,
      audio: 0,
      end: 2897542,
      filename: "/usr/local/share/vim/syntax/pinfo.vim"
    }, {
      start: 2897542,
      audio: 0,
      end: 2909313,
      filename: "/usr/local/share/vim/syntax/plsql.vim"
    }, {
      start: 2909313,
      audio: 0,
      end: 2914067,
      filename: "/usr/local/share/vim/syntax/mail.vim"
    }, {
      start: 2914067,
      audio: 0,
      end: 2922633,
      filename: "/usr/local/share/vim/syntax/rst.vim"
    }, {
      start: 2922633,
      audio: 0,
      end: 2925599,
      filename: "/usr/local/share/vim/syntax/purifylog.vim"
    }, {
      start: 2925599,
      audio: 0,
      end: 2928118,
      filename: "/usr/local/share/vim/syntax/resolv.vim"
    }, {
      start: 2928118,
      audio: 0,
      end: 2936585,
      filename: "/usr/local/share/vim/syntax/python.vim"
    }, {
      start: 2936585,
      audio: 0,
      end: 2945615,
      filename: "/usr/local/share/vim/syntax/freebasic.vim"
    }, {
      start: 2945615,
      audio: 0,
      end: 2965037,
      filename: "/usr/local/share/vim/syntax/aptconf.vim"
    }, {
      start: 2965037,
      audio: 0,
      end: 2970049,
      filename: "/usr/local/share/vim/syntax/kix.vim"
    }, {
      start: 2970049,
      audio: 0,
      end: 2971740,
      filename: "/usr/local/share/vim/syntax/ist.vim"
    }, {
      start: 2971740,
      audio: 0,
      end: 2974356,
      filename: "/usr/local/share/vim/syntax/valgrind.vim"
    }, {
      start: 2974356,
      audio: 0,
      end: 2976853,
      filename: "/usr/local/share/vim/syntax/amiga.vim"
    }, {
      start: 2976853,
      audio: 0,
      end: 2977621,
      filename: "/usr/local/share/vim/syntax/rrst.vim"
    }, {
      start: 2977621,
      audio: 0,
      end: 3003364,
      filename: "/usr/local/share/vim/syntax/ora.vim"
    }, {
      start: 3003364,
      audio: 0,
      end: 3003942,
      filename: "/usr/local/share/vim/syntax/aspperl.vim"
    }, {
      start: 3003942,
      audio: 0,
      end: 3003972,
      filename: "/usr/local/share/vim/syntax/dns.vim"
    }, {
      start: 3003972,
      audio: 0,
      end: 3005357,
      filename: "/usr/local/share/vim/syntax/group.vim"
    }, {
      start: 3005357,
      audio: 0,
      end: 3007010,
      filename: "/usr/local/share/vim/syntax/lhaskell.vim"
    }, {
      start: 3007010,
      audio: 0,
      end: 3023440,
      filename: "/usr/local/share/vim/syntax/diff.vim"
    }, {
      start: 3023440,
      audio: 0,
      end: 3023959,
      filename: "/usr/local/share/vim/syntax/smith.vim"
    }, {
      start: 3023959,
      audio: 0,
      end: 3029342,
      filename: "/usr/local/share/vim/syntax/csh.vim"
    }, {
      start: 3029342,
      audio: 0,
      end: 3034189,
      filename: "/usr/local/share/vim/syntax/stp.vim"
    }, {
      start: 3034189,
      audio: 0,
      end: 3036298,
      filename: "/usr/local/share/vim/syntax/m4.vim"
    }, {
      start: 3036298,
      audio: 0,
      end: 3041747,
      filename: "/usr/local/share/vim/syntax/samba.vim"
    }, {
      start: 3041747,
      audio: 0,
      end: 3042765,
      filename: "/usr/local/share/vim/syntax/crm.vim"
    }, {
      start: 3042765,
      audio: 0,
      end: 3044033,
      filename: "/usr/local/share/vim/syntax/svn.vim"
    }, {
      start: 3044033,
      audio: 0,
      end: 3044528,
      filename: "/usr/local/share/vim/syntax/ch.vim"
    }, {
      start: 3044528,
      audio: 0,
      end: 3049750,
      filename: "/usr/local/share/vim/syntax/fdcc.vim"
    }, {
      start: 3049750,
      audio: 0,
      end: 3053496,
      filename: "/usr/local/share/vim/syntax/slpreg.vim"
    }, {
      start: 3053496,
      audio: 0,
      end: 3060745,
      filename: "/usr/local/share/vim/syntax/btm.vim"
    }, {
      start: 3060745,
      audio: 0,
      end: 3064845,
      filename: "/usr/local/share/vim/syntax/git.vim"
    }, {
      start: 3064845,
      audio: 0,
      end: 3096339,
      filename: "/usr/local/share/vim/syntax/foxpro.vim"
    }, {
      start: 3096339,
      audio: 0,
      end: 3100335,
      filename: "/usr/local/share/vim/syntax/logindefs.vim"
    }, {
      start: 3100335,
      audio: 0,
      end: 3103440,
      filename: "/usr/local/share/vim/syntax/desktop.vim"
    }, {
      start: 3103440,
      audio: 0,
      end: 3108326,
      filename: "/usr/local/share/vim/syntax/make.vim"
    }, {
      start: 3108326,
      audio: 0,
      end: 3134901,
      filename: "/usr/local/share/vim/syntax/ishd.vim"
    }, {
      start: 3134901,
      audio: 0,
      end: 3135880,
      filename: "/usr/local/share/vim/syntax/mailcap.vim"
    }, {
      start: 3135880,
      audio: 0,
      end: 3136724,
      filename: "/usr/local/share/vim/syntax/sysctl.vim"
    }, {
      start: 3136724,
      audio: 0,
      end: 3138213,
      filename: "/usr/local/share/vim/syntax/sgmllnx.vim"
    }, {
      start: 3138213,
      audio: 0,
      end: 3144554,
      filename: "/usr/local/share/vim/syntax/xquery.vim"
    }, {
      start: 3144554,
      audio: 0,
      end: 3147062,
      filename: "/usr/local/share/vim/syntax/modsim3.vim"
    }, {
      start: 3147062,
      audio: 0,
      end: 3148281,
      filename: "/usr/local/share/vim/syntax/sensors.vim"
    }, {
      start: 3148281,
      audio: 0,
      end: 3166682,
      filename: "/usr/local/share/vim/syntax/pike.vim"
    }, {
      start: 3166682,
      audio: 0,
      end: 3166969,
      filename: "/usr/local/share/vim/syntax/rcslog.vim"
    }, {
      start: 3166969,
      audio: 0,
      end: 3170607,
      filename: "/usr/local/share/vim/syntax/opl.vim"
    }, {
      start: 3170607,
      audio: 0,
      end: 3173258,
      filename: "/usr/local/share/vim/syntax/expect.vim"
    }, {
      start: 3173258,
      audio: 0,
      end: 3176186,
      filename: "/usr/local/share/vim/syntax/gnash.vim"
    }, {
      start: 3176186,
      audio: 0,
      end: 3205738,
      filename: "/usr/local/share/vim/syntax/progress.vim"
    }, {
      start: 3205738,
      audio: 0,
      end: 3207062,
      filename: "/usr/local/share/vim/syntax/mgp.vim"
    }, {
      start: 3207062,
      audio: 0,
      end: 3215827,
      filename: "/usr/local/share/vim/syntax/gtkrc.vim"
    }, {
      start: 3215827,
      audio: 0,
      end: 3223287,
      filename: "/usr/local/share/vim/syntax/debcontrol.vim"
    }, {
      start: 3223287,
      audio: 0,
      end: 3224905,
      filename: "/usr/local/share/vim/syntax/kscript.vim"
    }, {
      start: 3224905,
      audio: 0,
      end: 3229512,
      filename: "/usr/local/share/vim/syntax/indent.vim"
    }, {
      start: 3229512,
      audio: 0,
      end: 3233553,
      filename: "/usr/local/share/vim/syntax/eviews.vim"
    }, {
      start: 3233553,
      audio: 0,
      end: 3236437,
      filename: "/usr/local/share/vim/syntax/eruby.vim"
    }, {
      start: 3236437,
      audio: 0,
      end: 3241431,
      filename: "/usr/local/share/vim/syntax/wsml.vim"
    }, {
      start: 3241431,
      audio: 0,
      end: 3250627,
      filename: "/usr/local/share/vim/syntax/forth.vim"
    }, {
      start: 3250627,
      audio: 0,
      end: 3253458,
      filename: "/usr/local/share/vim/syntax/wast.vim"
    }, {
      start: 3253458,
      audio: 0,
      end: 3256532,
      filename: "/usr/local/share/vim/syntax/cl.vim"
    }, {
      start: 3256532,
      audio: 0,
      end: 3257883,
      filename: "/usr/local/share/vim/syntax/sindaout.vim"
    }, {
      start: 3257883,
      audio: 0,
      end: 3261803,
      filename: "/usr/local/share/vim/syntax/murphi.vim"
    }, {
      start: 3261803,
      audio: 0,
      end: 3310340,
      filename: "/usr/local/share/vim/syntax/2html.vim"
    }, {
      start: 3310340,
      audio: 0,
      end: 3314151,
      filename: "/usr/local/share/vim/syntax/bindzone.vim"
    }, {
      start: 3314151,
      audio: 0,
      end: 3354496,
      filename: "/usr/local/share/vim/syntax/mp.vim"
    }, {
      start: 3354496,
      audio: 0,
      end: 3374397,
      filename: "/usr/local/share/vim/syntax/sudoers.vim"
    }, {
      start: 3374397,
      audio: 0,
      end: 3441110,
      filename: "/usr/local/share/vim/syntax/vim.vim"
    }, {
      start: 3441110,
      audio: 0,
      end: 3444528,
      filename: "/usr/local/share/vim/syntax/rego.vim"
    }, {
      start: 3444528,
      audio: 0,
      end: 3458356,
      filename: "/usr/local/share/vim/syntax/mf.vim"
    }, {
      start: 3458356,
      audio: 0,
      end: 3459077,
      filename: "/usr/local/share/vim/syntax/jgraph.vim"
    }, {
      start: 3459077,
      audio: 0,
      end: 3461946,
      filename: "/usr/local/share/vim/syntax/papp.vim"
    }, {
      start: 3461946,
      audio: 0,
      end: 3470791,
      filename: "/usr/local/share/vim/syntax/markdown.vim"
    }, {
      start: 3470791,
      audio: 0,
      end: 3473005,
      filename: "/usr/local/share/vim/syntax/asn.vim"
    }, {
      start: 3473005,
      audio: 0,
      end: 3544867,
      filename: "/usr/local/share/vim/syntax/baan.vim"
    }, {
      start: 3544867,
      audio: 0,
      end: 3545460,
      filename: "/usr/local/share/vim/syntax/catalog.vim"
    }, {
      start: 3545460,
      audio: 0,
      end: 3551661,
      filename: "/usr/local/share/vim/syntax/eiffel.vim"
    }, {
      start: 3551661,
      audio: 0,
      end: 3551971,
      filename: "/usr/local/share/vim/syntax/nosyntax.vim"
    }, {
      start: 3551971,
      audio: 0,
      end: 3560875,
      filename: "/usr/local/share/vim/syntax/erlang.vim"
    }, {
      start: 3560875,
      audio: 0,
      end: 3567118,
      filename: "/usr/local/share/vim/syntax/rebol.vim"
    }, {
      start: 3567118,
      audio: 0,
      end: 3579164,
      filename: "/usr/local/share/vim/syntax/n1ql.vim"
    }, {
      start: 3579164,
      audio: 0,
      end: 3582011,
      filename: "/usr/local/share/vim/syntax/gretl.vim"
    }, {
      start: 3582011,
      audio: 0,
      end: 3596498,
      filename: "/usr/local/share/vim/syntax/splint.vim"
    }, {
      start: 3596498,
      audio: 0,
      end: 3601899,
      filename: "/usr/local/share/vim/syntax/icon.vim"
    }, {
      start: 3601899,
      audio: 0,
      end: 3614071,
      filename: "/usr/local/share/vim/syntax/lua.vim"
    }, {
      start: 3614071,
      audio: 0,
      end: 3631742,
      filename: "/usr/local/share/vim/syntax/idl.vim"
    }, {
      start: 3631742,
      audio: 0,
      end: 3637720,
      filename: "/usr/local/share/vim/syntax/denyhosts.vim"
    }, {
      start: 3637720,
      audio: 0,
      end: 3640535,
      filename: "/usr/local/share/vim/syntax/usserverlog.vim"
    }, {
      start: 3640535,
      audio: 0,
      end: 3658126,
      filename: "/usr/local/share/vim/syntax/groovy.vim"
    }, {
      start: 3658126,
      audio: 0,
      end: 3661320,
      filename: "/usr/local/share/vim/syntax/povini.vim"
    }, {
      start: 3661320,
      audio: 0,
      end: 3669711,
      filename: "/usr/local/share/vim/syntax/fasm.vim"
    }, {
      start: 3669711,
      audio: 0,
      end: 3672025,
      filename: "/usr/local/share/vim/syntax/mix.vim"
    }, {
      start: 3672025,
      audio: 0,
      end: 3680871,
      filename: "/usr/local/share/vim/syntax/slpconf.vim"
    }, {
      start: 3680871,
      audio: 0,
      end: 3687005,
      filename: "/usr/local/share/vim/syntax/tf.vim"
    }, {
      start: 3687005,
      audio: 0,
      end: 3689880,
      filename: "/usr/local/share/vim/syntax/mel.vim"
    }, {
      start: 3689880,
      audio: 0,
      end: 3690320,
      filename: "/usr/local/share/vim/syntax/gitsendemail.vim"
    }, {
      start: 3690320,
      audio: 0,
      end: 3691172,
      filename: "/usr/local/share/vim/syntax/ldif.vim"
    }, {
      start: 3691172,
      audio: 0,
      end: 3698446,
      filename: "/usr/local/share/vim/syntax/j.vim"
    }, {
      start: 3698446,
      audio: 0,
      end: 3704346,
      filename: "/usr/local/share/vim/syntax/liquid.vim"
    }, {
      start: 3704346,
      audio: 0,
      end: 3707281,
      filename: "/usr/local/share/vim/syntax/lout.vim"
    }, {
      start: 3707281,
      audio: 0,
      end: 3713019,
      filename: "/usr/local/share/vim/syntax/radiance.vim"
    }, {
      start: 3713019,
      audio: 0,
      end: 3716833,
      filename: "/usr/local/share/vim/syntax/haste.vim"
    }, {
      start: 3716833,
      audio: 0,
      end: 3721209,
      filename: "/usr/local/share/vim/syntax/verilog.vim"
    }, {
      start: 3721209,
      audio: 0,
      end: 3732965,
      filename: "/usr/local/share/vim/syntax/winbatch.vim"
    }, {
      start: 3732965,
      audio: 0,
      end: 3733776,
      filename: "/usr/local/share/vim/syntax/wvdial.vim"
    }, {
      start: 3733776,
      audio: 0,
      end: 3734172,
      filename: "/usr/local/share/vim/syntax/syntax.vim"
    }, {
      start: 3734172,
      audio: 0,
      end: 3739145,
      filename: "/usr/local/share/vim/syntax/fan.vim"
    }, {
      start: 3739145,
      audio: 0,
      end: 3740132,
      filename: "/usr/local/share/vim/syntax/synload.vim"
    }, {
      start: 3740132,
      audio: 0,
      end: 3741861,
      filename: "/usr/local/share/vim/syntax/asm.vim"
    }, {
      start: 3741861,
      audio: 0,
      end: 3747503,
      filename: "/usr/local/share/vim/syntax/uc.vim"
    }, {
      start: 3747503,
      audio: 0,
      end: 3747596,
      filename: "/usr/local/share/vim/syntax/xs.vim"
    }, {
      start: 3747596,
      audio: 0,
      end: 3751058,
      filename: "/usr/local/share/vim/syntax/prolog.vim"
    }, {
      start: 3751058,
      audio: 0,
      end: 3752724,
      filename: "/usr/local/share/vim/syntax/procmail.vim"
    }, {
      start: 3752724,
      audio: 0,
      end: 3754543,
      filename: "/usr/local/share/vim/syntax/mailaliases.vim"
    }, {
      start: 3754543,
      audio: 0,
      end: 3809920,
      filename: "/usr/local/share/vim/syntax/tex.vim"
    }, {
      start: 3809920,
      audio: 0,
      end: 3811407,
      filename: "/usr/local/share/vim/syntax/dcd.vim"
    }, {
      start: 3811407,
      audio: 0,
      end: 3829045,
      filename: "/usr/local/share/vim/syntax/maxima.vim"
    }, {
      start: 3829045,
      audio: 0,
      end: 3831585,
      filename: "/usr/local/share/vim/syntax/dylan.vim"
    }, {
      start: 3831585,
      audio: 0,
      end: 3835491,
      filename: "/usr/local/share/vim/syntax/gpg.vim"
    }, {
      start: 3835491,
      audio: 0,
      end: 3838773,
      filename: "/usr/local/share/vim/syntax/psf.vim"
    }, {
      start: 3838773,
      audio: 0,
      end: 3838821,
      filename: "/usr/local/share/vim/syntax/docbkxml.vim"
    }, {
      start: 3838821,
      audio: 0,
      end: 3842833,
      filename: "/usr/local/share/vim/syntax/iss.vim"
    }, {
      start: 3842833,
      audio: 0,
      end: 3844719,
      filename: "/usr/local/share/vim/syntax/a2ps.vim"
    }, {
      start: 3844719,
      audio: 0,
      end: 3848880,
      filename: "/usr/local/share/vim/syntax/acedb.vim"
    }, {
      start: 3848880,
      audio: 0,
      end: 3852847,
      filename: "/usr/local/share/vim/syntax/gdb.vim"
    }, {
      start: 3852847,
      audio: 0,
      end: 3874289,
      filename: "/usr/local/share/vim/syntax/kconfig.vim"
    }, {
      start: 3874289,
      audio: 0,
      end: 3888041,
      filename: "/usr/local/share/vim/syntax/upstreamdat.vim"
    }, {
      start: 3888041,
      audio: 0,
      end: 3888879,
      filename: "/usr/local/share/vim/syntax/taskedit.vim"
    }, {
      start: 3888879,
      audio: 0,
      end: 3891735,
      filename: "/usr/local/share/vim/syntax/mason.vim"
    }, {
      start: 3891735,
      audio: 0,
      end: 3896748,
      filename: "/usr/local/share/vim/syntax/dircolors.vim"
    }, {
      start: 3896748,
      audio: 0,
      end: 3906503,
      filename: "/usr/local/share/vim/syntax/plaintex.vim"
    }, {
      start: 3906503,
      audio: 0,
      end: 3908437,
      filename: "/usr/local/share/vim/syntax/usw2kagtlog.vim"
    }, {
      start: 3908437,
      audio: 0,
      end: 3910898,
      filename: "/usr/local/share/vim/syntax/avra.vim"
    }, {
      start: 3910898,
      audio: 0,
      end: 3970735,
      filename: "/usr/local/share/vim/syntax/perl6.vim"
    }, {
      start: 3970735,
      audio: 0,
      end: 3979040,
      filename: "/usr/local/share/vim/syntax/nanorc.vim"
    }, {
      start: 3979040,
      audio: 0,
      end: 3998006,
      filename: "/usr/local/share/vim/syntax/scheme.vim"
    }, {
      start: 3998006,
      audio: 0,
      end: 4017232,
      filename: "/usr/local/share/vim/syntax/vb.vim"
    }, {
      start: 4017232,
      audio: 0,
      end: 4028447,
      filename: "/usr/local/share/vim/syntax/hog.vim"
    }, {
      start: 4028447,
      audio: 0,
      end: 4029125,
      filename: "/usr/local/share/vim/syntax/sindacmp.vim"
    }, {
      start: 4029125,
      audio: 0,
      end: 4029947,
      filename: "/usr/local/share/vim/syntax/edif.vim"
    }, {
      start: 4029947,
      audio: 0,
      end: 4031859,
      filename: "/usr/local/share/vim/syntax/udevperm.vim"
    }, {
      start: 4031859,
      audio: 0,
      end: 4039311,
      filename: "/usr/local/share/vim/syntax/csc.vim"
    }, {
      start: 4039311,
      audio: 0,
      end: 4044987,
      filename: "/usr/local/share/vim/syntax/jess.vim"
    }, {
      start: 4044987,
      audio: 0,
      end: 4046748,
      filename: "/usr/local/share/vim/syntax/texmf.vim"
    }, {
      start: 4046748,
      audio: 0,
      end: 4049535,
      filename: "/usr/local/share/vim/syntax/gitrebase.vim"
    }, {
      start: 4049535,
      audio: 0,
      end: 4051912,
      filename: "/usr/local/share/vim/syntax/mib.vim"
    }, {
      start: 4051912,
      audio: 0,
      end: 4053658,
      filename: "/usr/local/share/vim/syntax/changelog.vim"
    }, {
      start: 4053658,
      audio: 0,
      end: 4060125,
      filename: "/usr/local/share/vim/syntax/sqloracle.vim"
    }, {
      start: 4060125,
      audio: 0,
      end: 4061608,
      filename: "/usr/local/share/vim/syntax/gsp.vim"
    }, {
      start: 4061608,
      audio: 0,
      end: 4061990,
      filename: "/usr/local/share/vim/syntax/jargon.vim"
    }, {
      start: 4061990,
      audio: 0,
      end: 4066629,
      filename: "/usr/local/share/vim/syntax/pilrc.vim"
    }, {
      start: 4066629,
      audio: 0,
      end: 4069400,
      filename: "/usr/local/share/vim/syntax/focexec.vim"
    }, {
      start: 4069400,
      audio: 0,
      end: 4069619,
      filename: "/usr/local/share/vim/syntax/bzl.vim"
    }, {
      start: 4069619,
      audio: 0,
      end: 4070823,
      filename: "/usr/local/share/vim/syntax/trustees.vim"
    }, {
      start: 4070823,
      audio: 0,
      end: 4074141,
      filename: "/usr/local/share/vim/syntax/lprolog.vim"
    }, {
      start: 4074141,
      audio: 0,
      end: 4076627,
      filename: "/usr/local/share/vim/syntax/esterel.vim"
    }, {
      start: 4076627,
      audio: 0,
      end: 4080512,
      filename: "/usr/local/share/vim/syntax/occam.vim"
    }, {
      start: 4080512,
      audio: 0,
      end: 4081671,
      filename: "/usr/local/share/vim/syntax/spice.vim"
    }, {
      start: 4081671,
      audio: 0,
      end: 4083106,
      filename: "/usr/local/share/vim/syntax/snnsres.vim"
    }, {
      start: 4083106,
      audio: 0,
      end: 4096593,
      filename: "/usr/local/share/vim/syntax/ocaml.vim"
    }, {
      start: 4096593,
      audio: 0,
      end: 4098697,
      filename: "/usr/local/share/vim/syntax/messages.vim"
    }, {
      start: 4098697,
      audio: 0,
      end: 4099295,
      filename: "/usr/local/share/vim/syntax/abaqus.vim"
    }, {
      start: 4099295,
      audio: 0,
      end: 4101902,
      filename: "/usr/local/share/vim/syntax/dart.vim"
    }, {
      start: 4101902,
      audio: 0,
      end: 4102475,
      filename: "/usr/local/share/vim/syntax/ppd.vim"
    }, {
      start: 4102475,
      audio: 0,
      end: 4103222,
      filename: "/usr/local/share/vim/syntax/sbt.vim"
    }, {
      start: 4103222,
      audio: 0,
      end: 4106063,
      filename: "/usr/local/share/vim/syntax/xpm.vim"
    }, {
      start: 4106063,
      audio: 0,
      end: 4116698,
      filename: "/usr/local/share/vim/syntax/falcon.vim"
    }, {
      start: 4116698,
      audio: 0,
      end: 4124960,
      filename: "/usr/local/share/vim/syntax/sml.vim"
    }, {
      start: 4124960,
      audio: 0,
      end: 4150235,
      filename: "/usr/local/share/vim/syntax/jam.vim"
    }, {
      start: 4150235,
      audio: 0,
      end: 4152885,
      filename: "/usr/local/share/vim/syntax/desc.vim"
    }, {
      start: 4152885,
      audio: 0,
      end: 4160137,
      filename: "/usr/local/share/vim/syntax/basic.vim"
    }, {
      start: 4160137,
      audio: 0,
      end: 4171128,
      filename: "/usr/local/share/vim/syntax/r.vim"
    }, {
      start: 4171128,
      audio: 0,
      end: 4176509,
      filename: "/usr/local/share/vim/syntax/tmux.vim"
    }, {
      start: 4176509,
      audio: 0,
      end: 4187799,
      filename: "/usr/local/share/vim/syntax/xinetd.vim"
    }, {
      start: 4187799,
      audio: 0,
      end: 4187895,
      filename: "/usr/local/share/vim/syntax/svg.vim"
    }, {
      start: 4187895,
      audio: 0,
      end: 4213766,
      filename: "/usr/local/share/vim/syntax/d.vim"
    }, {
      start: 4213766,
      audio: 0,
      end: 4215047,
      filename: "/usr/local/share/vim/syntax/tilde.vim"
    }, {
      start: 4215047,
      audio: 0,
      end: 4223346,
      filename: "/usr/local/share/vim/syntax/jal.vim"
    }, {
      start: 4223346,
      audio: 0,
      end: 4224092,
      filename: "/usr/local/share/vim/syntax/antlr.vim"
    }, {
      start: 4224092,
      audio: 0,
      end: 4227464,
      filename: "/usr/local/share/vim/syntax/grub.vim"
    }, {
      start: 4227464,
      audio: 0,
      end: 4228735,
      filename: "/usr/local/share/vim/syntax/alsaconf.vim"
    }, {
      start: 4228735,
      audio: 0,
      end: 4229360,
      filename: "/usr/local/share/vim/syntax/kivy.vim"
    }, {
      start: 4229360,
      audio: 0,
      end: 4274146,
      filename: "/usr/local/share/vim/syntax/autoit.vim"
    }, {
      start: 4274146,
      audio: 0,
      end: 4274830,
      filename: "/usr/local/share/vim/syntax/vsejcl.vim"
    }, {
      start: 4274830,
      audio: 0,
      end: 4274927,
      filename: "/usr/local/share/vim/syntax/systemd.vim"
    }, {
      start: 4274927,
      audio: 0,
      end: 4278035,
      filename: "/usr/local/share/vim/syntax/syncolor.vim"
    }, {
      start: 4278035,
      audio: 0,
      end: 4283032,
      filename: "/usr/local/share/vim/syntax/cterm.vim"
    }, {
      start: 4283032,
      audio: 0,
      end: 4315324,
      filename: "/usr/local/share/vim/syntax/nsis.vim"
    }, {
      start: 4315324,
      audio: 0,
      end: 4317847,
      filename: "/usr/local/share/vim/syntax/ptcap.vim"
    }, {
      start: 4317847,
      audio: 0,
      end: 4320542,
      filename: "/usr/local/share/vim/syntax/pic.vim"
    }, {
      start: 4320542,
      audio: 0,
      end: 4395432,
      filename: "/usr/local/share/vim/syntax/php.vim"
    }, {
      start: 4395432,
      audio: 0,
      end: 4397991,
      filename: "/usr/local/share/vim/syntax/webmacro.vim"
    }, {
      start: 4397991,
      audio: 0,
      end: 4401361,
      filename: "/usr/local/share/vim/syntax/dtrace.vim"
    }, {
      start: 4401361,
      audio: 0,
      end: 4403222,
      filename: "/usr/local/share/vim/syntax/gprof.vim"
    }, {
      start: 4403222,
      audio: 0,
      end: 4404560,
      filename: "/usr/local/share/vim/syntax/rpcgen.vim"
    }, {
      start: 4404560,
      audio: 0,
      end: 4407460,
      filename: "/usr/local/share/vim/syntax/sather.vim"
    }, {
      start: 4407460,
      audio: 0,
      end: 4409239,
      filename: "/usr/local/share/vim/syntax/xsd.vim"
    }, {
      start: 4409239,
      audio: 0,
      end: 4409890,
      filename: "/usr/local/share/vim/syntax/sendpr.vim"
    }, {
      start: 4409890,
      audio: 0,
      end: 4416107,
      filename: "/usr/local/share/vim/syntax/netrw.vim"
    }, {
      start: 4416107,
      audio: 0,
      end: 4418320,
      filename: "/usr/local/share/vim/syntax/tssgm.vim"
    }, {
      start: 4418320,
      audio: 0,
      end: 4420636,
      filename: "/usr/local/share/vim/syntax/upstreamlog.vim"
    }, {
      start: 4420636,
      audio: 0,
      end: 4436022,
      filename: "/usr/local/share/vim/syntax/logtalk.vim"
    }, {
      start: 4436022,
      audio: 0,
      end: 4438848,
      filename: "/usr/local/share/vim/syntax/xkb.vim"
    }, {
      start: 4438848,
      audio: 0,
      end: 4445518,
      filename: "/usr/local/share/vim/syntax/tsalt.vim"
    }, {
      start: 4445518,
      audio: 0,
      end: 4448642,
      filename: "/usr/local/share/vim/syntax/vroom.vim"
    }, {
      start: 4448642,
      audio: 0,
      end: 4450204,
      filename: "/usr/local/share/vim/syntax/crontab.vim"
    }, {
      start: 4450204,
      audio: 0,
      end: 4478789,
      filename: "/usr/local/share/vim/syntax/css.vim"
    }, {
      start: 4478789,
      audio: 0,
      end: 4486395,
      filename: "/usr/local/share/vim/syntax/htmlos.vim"
    }, {
      start: 4486395,
      audio: 0,
      end: 4495805,
      filename: "/usr/local/share/vim/syntax/cs.vim"
    }, {
      start: 4495805,
      audio: 0,
      end: 4497123,
      filename: "/usr/local/share/vim/syntax/rnoweb.vim"
    }, {
      start: 4497123,
      audio: 0,
      end: 4498186,
      filename: "/usr/local/share/vim/syntax/art.vim"
    }, {
      start: 4498186,
      audio: 0,
      end: 4503585,
      filename: "/usr/local/share/vim/syntax/form.vim"
    }, {
      start: 4503585,
      audio: 0,
      end: 4503653,
      filename: "/usr/local/share/vim/syntax/template.vim"
    }, {
      start: 4503653,
      audio: 0,
      end: 4506088,
      filename: "/usr/local/share/vim/syntax/cdl.vim"
    }, {
      start: 4506088,
      audio: 0,
      end: 4517859,
      filename: "/usr/local/share/vim/syntax/vrml.vim"
    }, {
      start: 4517859,
      audio: 0,
      end: 4519215,
      filename: "/usr/local/share/vim/syntax/cuplsim.vim"
    }, {
      start: 4519215,
      audio: 0,
      end: 4519823,
      filename: "/usr/local/share/vim/syntax/dosini.vim"
    }, {
      start: 4519823,
      audio: 0,
      end: 4537827,
      filename: "/usr/local/share/vim/syntax/initex.vim"
    }, {
      start: 4537827,
      audio: 0,
      end: 4548128,
      filename: "/usr/local/share/vim/syntax/rhelp.vim"
    }, {
      start: 4548128,
      audio: 0,
      end: 4552351,
      filename: "/usr/local/share/vim/syntax/wml.vim"
    }, {
      start: 4552351,
      audio: 0,
      end: 4552868,
      filename: "/usr/local/share/vim/syntax/cynpp.vim"
    }, {
      start: 4552868,
      audio: 0,
      end: 4553358,
      filename: "/usr/local/share/vim/syntax/typescript.vim"
    }, {
      start: 4553358,
      audio: 0,
      end: 4558225,
      filename: "/usr/local/share/vim/syntax/gitcommit.vim"
    }, {
      start: 4558225,
      audio: 0,
      end: 4558274,
      filename: "/usr/local/share/vim/syntax/docbksgml.vim"
    }, {
      start: 4558274,
      audio: 0,
      end: 4564515,
      filename: "/usr/local/share/vim/syntax/sqlforms.vim"
    }, {
      start: 4564515,
      audio: 0,
      end: 4568215,
      filename: "/usr/local/share/vim/syntax/gkrellmrc.vim"
    }, {
      start: 4568215,
      audio: 0,
      end: 4570862,
      filename: "/usr/local/share/vim/syntax/scilab.vim"
    }, {
      start: 4570862,
      audio: 0,
      end: 4572284,
      filename: "/usr/local/share/vim/syntax/gitconfig.vim"
    }, {
      start: 4572284,
      audio: 0,
      end: 4574518,
      filename: "/usr/local/share/vim/syntax/dictconf.vim"
    }, {
      start: 4574518,
      audio: 0,
      end: 4590710,
      filename: "/usr/local/share/vim/syntax/masm.vim"
    }, {
      start: 4590710,
      audio: 0,
      end: 4591018,
      filename: "/usr/local/share/vim/syntax/objcpp.vim"
    }, {
      start: 4591018,
      audio: 0,
      end: 4622349,
      filename: "/usr/local/share/vim/syntax/cucumber.vim"
    }, {
      start: 4622349,
      audio: 0,
      end: 4624034,
      filename: "/usr/local/share/vim/syntax/rib.vim"
    }, {
      start: 4624034,
      audio: 0,
      end: 4625641,
      filename: "/usr/local/share/vim/syntax/netrc.vim"
    }, {
      start: 4625641,
      audio: 0,
      end: 4630128,
      filename: "/usr/local/share/vim/syntax/xdefaults.vim"
    }, {
      start: 4630128,
      audio: 0,
      end: 4632038,
      filename: "/usr/local/share/vim/syntax/dracula.vim"
    }, {
      start: 4632038,
      audio: 0,
      end: 4637437,
      filename: "/usr/local/share/vim/syntax/dcl.vim"
    }, {
      start: 4637437,
      audio: 0,
      end: 4638484,
      filename: "/usr/local/share/vim/syntax/pyrex.vim"
    }, {
      start: 4638484,
      audio: 0,
      end: 4679216,
      filename: "/usr/local/share/vim/syntax/postscr.vim"
    }, {
      start: 4679216,
      audio: 0,
      end: 4690674,
      filename: "/usr/local/share/vim/syntax/cf.vim"
    }, {
      start: 4690674,
      audio: 0,
      end: 4714209,
      filename: "/usr/local/share/vim/syntax/c.vim"
    }, {
      start: 4714209,
      audio: 0,
      end: 4717776,
      filename: "/usr/local/share/vim/syntax/ampl.vim"
    }, {
      start: 4717776,
      audio: 0,
      end: 4728950,
      filename: "/usr/local/share/vim/syntax/sshdconfig.vim"
    }, {
      start: 4728950,
      audio: 0,
      end: 4734097,
      filename: "/usr/local/share/vim/syntax/csp.vim"
    }, {
      start: 4734097,
      audio: 0,
      end: 4735173,
      filename: "/usr/local/share/vim/syntax/dts.vim"
    }, {
      start: 4735173,
      audio: 0,
      end: 4737530,
      filename: "/usr/local/share/vim/syntax/tpp.vim"
    }, {
      start: 4737530,
      audio: 0,
      end: 4740509,
      filename: "/usr/local/share/vim/syntax/dtd.vim"
    }, {
      start: 4740509,
      audio: 0,
      end: 4744620,
      filename: "/usr/local/share/vim/syntax/b.vim"
    }, {
      start: 4744620,
      audio: 0,
      end: 4745931,
      filename: "/usr/local/share/vim/syntax/bc.vim"
    }, {
      start: 4745931,
      audio: 0,
      end: 4756001,
      filename: "/usr/local/share/vim/syntax/autohotkey.vim"
    }, {
      start: 4756001,
      audio: 0,
      end: 4759285,
      filename: "/usr/local/share/vim/syntax/mgl.vim"
    }, {
      start: 4759285,
      audio: 0,
      end: 4759597,
      filename: "/usr/local/share/vim/syntax/htmlcheetah.vim"
    }, {
      start: 4759597,
      audio: 0,
      end: 4761574,
      filename: "/usr/local/share/vim/syntax/passwd.vim"
    }, {
      start: 4761574,
      audio: 0,
      end: 4775451,
      filename: "/usr/local/share/vim/syntax/upstreamrpt.vim"
    }, {
      start: 4775451,
      audio: 0,
      end: 4786578,
      filename: "/usr/local/share/vim/syntax/smcl.vim"
    }, {
      start: 4786578,
      audio: 0,
      end: 4787834,
      filename: "/usr/local/share/vim/syntax/dune.vim"
    }, {
      start: 4787834,
      audio: 0,
      end: 4788718,
      filename: "/usr/local/share/vim/syntax/cfg.vim"
    }, {
      start: 4788718,
      audio: 0,
      end: 4793900,
      filename: "/usr/local/share/vim/syntax/ibasic.vim"
    }, {
      start: 4793900,
      audio: 0,
      end: 4794735,
      filename: "/usr/local/share/vim/syntax/htmldjango.vim"
    }, {
      start: 4794735,
      audio: 0,
      end: 4795387,
      filename: "/usr/local/share/vim/syntax/esmtprc.vim"
    }, {
      start: 4795387,
      audio: 0,
      end: 4805234,
      filename: "/usr/local/share/vim/syntax/lilo.vim"
    }, {
      start: 4805234,
      audio: 0,
      end: 4808837,
      filename: "/usr/local/share/vim/syntax/wget.vim"
    }, {
      start: 4808837,
      audio: 0,
      end: 4812860,
      filename: "/usr/local/share/vim/syntax/mmix.vim"
    }, {
      start: 4812860,
      audio: 0,
      end: 4814654,
      filename: "/usr/local/share/vim/syntax/cynlib.vim"
    }, {
      start: 4814654,
      audio: 0,
      end: 4826738,
      filename: "/usr/local/share/vim/syntax/spup.vim"
    }, {
      start: 4826738,
      audio: 0,
      end: 4839615,
      filename: "/usr/local/share/vim/syntax/ncf.vim"
    }, {
      start: 4839615,
      audio: 0,
      end: 4842151,
      filename: "/usr/local/share/vim/syntax/elmfilt.vim"
    }, {
      start: 4842151,
      audio: 0,
      end: 4842400,
      filename: "/usr/local/share/vim/syntax/whitespace.vim"
    }, {
      start: 4842400,
      audio: 0,
      end: 4845234,
      filename: "/usr/local/share/vim/syntax/simula.vim"
    }, {
      start: 4845234,
      audio: 0,
      end: 4848383,
      filename: "/usr/local/share/vim/syntax/pdf.vim"
    }, {
      start: 4848383,
      audio: 0,
      end: 4853438,
      filename: "/usr/local/share/vim/syntax/sgml.vim"
    }, {
      start: 4853438,
      audio: 0,
      end: 4858603,
      filename: "/usr/local/share/vim/syntax/dosbatch.vim"
    }, {
      start: 4858603,
      audio: 0,
      end: 4860878,
      filename: "/usr/local/share/vim/syntax/smarty.vim"
    }, {
      start: 4860878,
      audio: 0,
      end: 4865676,
      filename: "/usr/local/share/vim/syntax/euphoria3.vim"
    }, {
      start: 4865676,
      audio: 0,
      end: 4866722,
      filename: "/usr/local/share/vim/syntax/modconf.vim"
    }, {
      start: 4866722,
      audio: 0,
      end: 4876343,
      filename: "/usr/local/share/vim/syntax/framescript.vim"
    }, {
      start: 4876343,
      audio: 0,
      end: 4891421,
      filename: "/usr/local/share/vim/syntax/pine.vim"
    }, {
      start: 4891421,
      audio: 0,
      end: 4911264,
      filename: "/usr/local/share/vim/syntax/sisu.vim"
    }, {
      start: 4911264,
      audio: 0,
      end: 4923357,
      filename: "/usr/local/share/vim/syntax/yaml.vim"
    }, {
      start: 4923357,
      audio: 0,
      end: 4924882,
      filename: "/usr/local/share/vim/syntax/arduino.vim"
    }, {
      start: 4924882,
      audio: 0,
      end: 4926376,
      filename: "/usr/local/share/vim/syntax/asmh8300.vim"
    }, {
      start: 4926376,
      audio: 0,
      end: 4927337,
      filename: "/usr/local/share/vim/syntax/sdc.vim"
    }, {
      start: 4927337,
      audio: 0,
      end: 4929491,
      filename: "/usr/local/share/vim/syntax/inittab.vim"
    }, {
      start: 4929491,
      audio: 0,
      end: 4931148,
      filename: "/usr/local/share/vim/syntax/proto.vim"
    }, {
      start: 4931148,
      audio: 0,
      end: 4936002,
      filename: "/usr/local/share/vim/syntax/awk.vim"
    }, {
      start: 4936002,
      audio: 0,
      end: 4938334,
      filename: "/usr/local/share/vim/syntax/sm.vim"
    }, {
      start: 4938334,
      audio: 0,
      end: 4964150,
      filename: "/usr/local/share/vim/syntax/stata.vim"
    }, {
      start: 4964150,
      audio: 0,
      end: 4966295,
      filename: "/usr/local/share/vim/syntax/atlas.vim"
    }, {
      start: 4966295,
      audio: 0,
      end: 5046972,
      filename: "/usr/local/share/vim/syntax/redif.vim"
    }, {
      start: 5046972,
      audio: 0,
      end: 5048383,
      filename: "/usr/local/share/vim/syntax/mallard.vim"
    }, {
      start: 5048383,
      audio: 0,
      end: 5050452,
      filename: "/usr/local/share/vim/syntax/chaiscript.vim"
    }, {
      start: 5050452,
      audio: 0,
      end: 5055555,
      filename: "/usr/local/share/vim/syntax/aap.vim"
    }, {
      start: 5055555,
      audio: 0,
      end: 5058547,
      filename: "/usr/local/share/vim/syntax/cupl.vim"
    }, {
      start: 5058547,
      audio: 0,
      end: 5061842,
      filename: "/usr/local/share/vim/syntax/privoxy.vim"
    }, {
      start: 5061842,
      audio: 0,
      end: 5064693,
      filename: "/usr/local/share/vim/syntax/sl.vim"
    }, {
      start: 5064693,
      audio: 0,
      end: 5070204,
      filename: "/usr/local/share/vim/syntax/specman.vim"
    }, {
      start: 5070204,
      audio: 0,
      end: 5073173,
      filename: "/usr/local/share/vim/syntax/latte.vim"
    }, {
      start: 5073173,
      audio: 0,
      end: 5087314,
      filename: "/usr/local/share/vim/syntax/mupad.vim"
    }, {
      start: 5087314,
      audio: 0,
      end: 5091952,
      filename: "/usr/local/share/vim/syntax/dictdconf.vim"
    }, {
      start: 5091952,
      audio: 0,
      end: 5093237,
      filename: "/usr/local/share/vim/syntax/promela.vim"
    }, {
      start: 5093237,
      audio: 0,
      end: 5095413,
      filename: "/usr/local/share/vim/syntax/jproperties.vim"
    }, {
      start: 5095413,
      audio: 0,
      end: 5096503,
      filename: "/usr/local/share/vim/syntax/ipfilter.vim"
    }, {
      start: 5096503,
      audio: 0,
      end: 5098606,
      filename: "/usr/local/share/vim/syntax/snnsnet.vim"
    }, {
      start: 5098606,
      audio: 0,
      end: 5098815,
      filename: "/usr/local/share/vim/syntax/web.vim"
    }, {
      start: 5098815,
      audio: 0,
      end: 5116406,
      filename: "/usr/local/share/vim/syntax/lpc.vim"
    }, {
      start: 5116406,
      audio: 0,
      end: 5125702,
      filename: "/usr/local/share/vim/syntax/cmusrc.vim"
    }, {
      start: 5125702,
      audio: 0,
      end: 5127546,
      filename: "/usr/local/share/vim/syntax/kwt.vim"
    }, {
      start: 5127546,
      audio: 0,
      end: 5128596,
      filename: "/usr/local/share/vim/syntax/coco.vim"
    }, {
      start: 5128596,
      audio: 0,
      end: 5132669,
      filename: "/usr/local/share/vim/syntax/calendar.vim"
    }, {
      start: 5132669,
      audio: 0,
      end: 5133582,
      filename: "/usr/local/share/vim/syntax/cvsrc.vim"
    }, {
      start: 5133582,
      audio: 0,
      end: 5144587,
      filename: "/usr/local/share/vim/syntax/pli.vim"
    }, {
      start: 5144587,
      audio: 0,
      end: 5148542,
      filename: "/usr/local/share/vim/syntax/less.vim"
    }, {
      start: 5148542,
      audio: 0,
      end: 5150017,
      filename: "/usr/local/share/vim/syntax/rcs.vim"
    }, {
      start: 5150017,
      audio: 0,
      end: 5150452,
      filename: "/usr/local/share/vim/syntax/libao.vim"
    }, {
      start: 5150452,
      audio: 0,
      end: 5152372,
      filename: "/usr/local/share/vim/syntax/rnc.vim"
    }, {
      start: 5152372,
      audio: 0,
      end: 5153727,
      filename: "/usr/local/share/vim/syntax/elf.vim"
    }, {
      start: 5153727,
      audio: 0,
      end: 5156962,
      filename: "/usr/local/share/vim/syntax/hostconf.vim"
    }, {
      start: 5156962,
      audio: 0,
      end: 5161272,
      filename: "/usr/local/share/vim/syntax/sed.vim"
    }, {
      start: 5161272,
      audio: 0,
      end: 5164012,
      filename: "/usr/local/share/vim/syntax/debchangelog.vim"
    }, {
      start: 5164012,
      audio: 0,
      end: 5168111,
      filename: "/usr/local/share/vim/syntax/diva.vim"
    }, {
      start: 5168111,
      audio: 0,
      end: 5168467,
      filename: "/usr/local/share/vim/syntax/qf.vim"
    }, {
      start: 5168467,
      audio: 0,
      end: 5208759,
      filename: "/usr/local/share/vim/syntax/clojure.vim"
    }, {
      start: 5208759,
      audio: 0,
      end: 5210897,
      filename: "/usr/local/share/vim/syntax/chordpro.vim"
    }, {
      start: 5210897,
      audio: 0,
      end: 5210953,
      filename: "/usr/local/share/vim/syntax/xhtml.vim"
    }, {
      start: 5210953,
      audio: 0,
      end: 5211822,
      filename: "/usr/local/share/vim/syntax/tags.vim"
    }, {
      start: 5211822,
      audio: 0,
      end: 5217161,
      filename: "/usr/local/share/vim/syntax/litestep.vim"
    }, {
      start: 5217161,
      audio: 0,
      end: 5220796,
      filename: "/usr/local/share/vim/syntax/aflex.vim"
    }, {
      start: 5220796,
      audio: 0,
      end: 5239174,
      filename: "/usr/local/share/vim/syntax/inform.vim"
    }, {
      start: 5239174,
      audio: 0,
      end: 5240017,
      filename: "/usr/local/share/vim/syntax/updatedb.vim"
    }, {
      start: 5240017,
      audio: 0,
      end: 5241359,
      filename: "/usr/local/share/vim/syntax/ninja.vim"
    }, {
      start: 5241359,
      audio: 0,
      end: 5244086,
      filename: "/usr/local/share/vim/syntax/slrnsc.vim"
    }, {
      start: 5244086,
      audio: 0,
      end: 5244477,
      filename: "/usr/local/share/vim/syntax/xxd.vim"
    }, {
      start: 5244477,
      audio: 0,
      end: 5246741,
      filename: "/usr/local/share/vim/syntax/tak.vim"
    }, {
      start: 5246741,
      audio: 0,
      end: 5264153,
      filename: "/usr/local/share/vim/syntax/html.vim"
    }, {
      start: 5264153,
      audio: 0,
      end: 5264645,
      filename: "/usr/local/share/vim/syntax/apachestyle.vim"
    }, {
      start: 5264645,
      audio: 0,
      end: 5265669,
      filename: "/usr/local/share/vim/syntax/protocols.vim"
    }, {
      start: 5265669,
      audio: 0,
      end: 5270481,
      filename: "/usr/local/share/vim/syntax/hercules.vim"
    }, {
      start: 5270481,
      audio: 0,
      end: 5270796,
      filename: "/usr/local/share/vim/syntax/manual.vim"
    }, {
      start: 5270796,
      audio: 0,
      end: 5294402,
      filename: "/usr/local/share/vim/syntax/csdl.vim"
    }, {
      start: 5294402,
      audio: 0,
      end: 5309914,
      filename: "/usr/local/share/vim/syntax/dtml.vim"
    }, {
      start: 5309914,
      audio: 0,
      end: 5314992,
      filename: "/usr/local/share/vim/syntax/pod.vim"
    }, {
      start: 5314992,
      audio: 0,
      end: 5316890,
      filename: "/usr/local/share/vim/syntax/remind.vim"
    }, {
      start: 5316890,
      audio: 0,
      end: 5319948,
      filename: "/usr/local/share/vim/syntax/cdrdaoconf.vim"
    }, {
      start: 5319948,
      audio: 0,
      end: 5322272,
      filename: "/usr/local/share/vim/syntax/bst.vim"
    }, {
      start: 5322272,
      audio: 0,
      end: 5345011,
      filename: "/usr/local/share/vim/syntax/texinfo.vim"
    }, {
      start: 5345011,
      audio: 0,
      end: 5360327,
      filename: "/usr/local/share/vim/syntax/lsl.vim"
    }, {
      start: 5360327,
      audio: 0,
      end: 5400379,
      filename: "/usr/local/share/vim/syntax/cmake.vim"
    }, {
      start: 5400379,
      audio: 0,
      end: 5402207,
      filename: "/usr/local/share/vim/syntax/msql.vim"
    }, {
      start: 5402207,
      audio: 0,
      end: 5412209,
      filename: "/usr/local/share/vim/syntax/xmath.vim"
    }, {
      start: 5412209,
      audio: 0,
      end: 5417258,
      filename: "/usr/local/share/vim/syntax/asterisk.vim"
    }, {
      start: 5417258,
      audio: 0,
      end: 5419690,
      filename: "/usr/local/share/vim/syntax/clean.vim"
    }, {
      start: 5419690,
      audio: 0,
      end: 5419918,
      filename: "/usr/local/share/vim/syntax/wdiff.vim"
    }, {
      start: 5419918,
      audio: 0,
      end: 5427741,
      filename: "/usr/local/share/vim/syntax/help.vim"
    }, {
      start: 5427741,
      audio: 0,
      end: 5427967,
      filename: "/usr/local/share/vim/syntax/tt2js.vim"
    }, {
      start: 5427967,
      audio: 0,
      end: 5431093,
      filename: "/usr/local/share/vim/syntax/django.vim"
    }, {
      start: 5431093,
      audio: 0,
      end: 5431871,
      filename: "/usr/local/share/vim/syntax/wsh.vim"
    }, {
      start: 5431871,
      audio: 0,
      end: 5447410,
      filename: "/usr/local/share/vim/syntax/mysql.vim"
    }, {
      start: 5447410,
      audio: 0,
      end: 5448105,
      filename: "/usr/local/share/vim/syntax/upstreaminstalllog.vim"
    }, {
      start: 5448105,
      audio: 0,
      end: 5456689,
      filename: "/usr/local/share/vim/syntax/sqlhana.vim"
    }, {
      start: 5456689,
      audio: 0,
      end: 5468586,
      filename: "/usr/local/share/vim/syntax/slrnrc.vim"
    }, {
      start: 5468586,
      audio: 0,
      end: 5484815,
      filename: "/usr/local/share/vim/syntax/vera.vim"
    }, {
      start: 5484815,
      audio: 0,
      end: 5490807,
      filename: "/usr/local/share/vim/syntax/a65.vim"
    }, {
      start: 5490807,
      audio: 0,
      end: 5495790,
      filename: "/usr/local/share/vim/syntax/lftp.vim"
    }, {
      start: 5495790,
      audio: 0,
      end: 5499545,
      filename: "/usr/local/share/vim/syntax/setserial.vim"
    }, {
      start: 5499545,
      audio: 0,
      end: 5524072,
      filename: "/usr/local/share/vim/syntax/maple.vim"
    }, {
      start: 5524072,
      audio: 0,
      end: 5525117,
      filename: "/usr/local/share/vim/syntax/pcap.vim"
    }, {
      start: 5525117,
      audio: 0,
      end: 5526129,
      filename: "/usr/local/share/vim/syntax/limits.vim"
    }, {
      start: 5526129,
      audio: 0,
      end: 5529157,
      filename: "/usr/local/share/vim/syntax/msidl.vim"
    }, {
      start: 5529157,
      audio: 0,
      end: 5530929,
      filename: "/usr/local/share/vim/syntax/esqlc.vim"
    }, {
      start: 5530929,
      audio: 0,
      end: 5541601,
      filename: "/usr/local/share/vim/syntax/sqr.vim"
    }, {
      start: 5541601,
      audio: 0,
      end: 5549392,
      filename: "/usr/local/share/vim/syntax/elinks.vim"
    }, {
      start: 5549392,
      audio: 0,
      end: 5550220,
      filename: "/usr/local/share/vim/syntax/slpspi.vim"
    }, {
      start: 5550220,
      audio: 0,
      end: 5556112,
      filename: "/usr/local/share/vim/syntax/go.vim"
    }, {
      start: 5556112,
      audio: 0,
      end: 5560620,
      filename: "/usr/local/share/vim/syntax/snobol4.vim"
    }, {
      start: 5560620,
      audio: 0,
      end: 5561421,
      filename: "/usr/local/share/vim/syntax/taskdata.vim"
    }, {
      start: 5561421,
      audio: 0,
      end: 5563599,
      filename: "/usr/local/share/vim/syntax/ahdl.vim"
    }, {
      start: 5563599,
      audio: 0,
      end: 5583492,
      filename: "/usr/local/share/vim/syntax/cdrtoc.vim"
    }, {
      start: 5583492,
      audio: 0,
      end: 5584697,
      filename: "/usr/local/share/vim/syntax/tli.vim"
    }, {
      start: 5584697,
      audio: 0,
      end: 5594807,
      filename: "/usr/local/share/vim/syntax/pf.vim"
    }, {
      start: 5594807,
      audio: 0,
      end: 5604322,
      filename: "/usr/local/share/vim/syntax/asciidoc.vim"
    }, {
      start: 5604322,
      audio: 0,
      end: 5609142,
      filename: "/usr/local/share/vim/syntax/msmessages.vim"
    }, {
      start: 5609142,
      audio: 0,
      end: 5610049,
      filename: "/usr/local/share/vim/syntax/arch.vim"
    }, {
      start: 5610049,
      audio: 0,
      end: 5610613,
      filename: "/usr/local/share/vim/syntax/rng.vim"
    }, {
      start: 5610613,
      audio: 0,
      end: 5613926,
      filename: "/usr/local/share/vim/syntax/datascript.vim"
    }, {
      start: 5613926,
      audio: 0,
      end: 5618819,
      filename: "/usr/local/share/vim/syntax/context.vim"
    }, {
      start: 5618819,
      audio: 0,
      end: 5629495,
      filename: "/usr/local/share/vim/syntax/nqc.vim"
    }, {
      start: 5629495,
      audio: 0,
      end: 5634072,
      filename: "/usr/local/share/vim/syntax/mplayerconf.vim"
    }, {
      start: 5634072,
      audio: 0,
      end: 5638481,
      filename: "/usr/local/share/vim/syntax/clipper.vim"
    }, {
      start: 5638481,
      audio: 0,
      end: 5638763,
      filename: "/usr/local/share/vim/syntax/fvwm2m4.vim"
    }, {
      start: 5638763,
      audio: 0,
      end: 5643807,
      filename: "/usr/local/share/vim/syntax/udevrules.vim"
    }, {
      start: 5643807,
      audio: 0,
      end: 5652306,
      filename: "/usr/local/share/vim/syntax/pov.vim"
    }, {
      start: 5652306,
      audio: 0,
      end: 5656357,
      filename: "/usr/local/share/vim/syntax/plm.vim"
    }, {
      start: 5656357,
      audio: 0,
      end: 5659e3,
      filename: "/usr/local/share/vim/syntax/meson.vim"
    }, {
      start: 5659e3,
      audio: 0,
      end: 5672062,
      filename: "/usr/local/share/vim/syntax/euphoria4.vim"
    }, {
      start: 5672062,
      audio: 0,
      end: 5675768,
      filename: "/usr/local/share/vim/syntax/pamconf.vim"
    }, {
      start: 5675768,
      audio: 0,
      end: 5679106,
      filename: "/usr/local/share/vim/syntax/screen.vim"
    }, {
      start: 5679106,
      audio: 0,
      end: 5681924,
      filename: "/usr/local/share/vim/syntax/gdmo.vim"
    }, {
      start: 5681924,
      audio: 0,
      end: 5681985,
      filename: "/usr/local/share/vim/syntax/phtml.vim"
    }, {
      start: 5681985,
      audio: 0,
      end: 5682145,
      filename: "/usr/local/share/vim/syntax/godoc.vim"
    }, {
      start: 5682145,
      audio: 0,
      end: 5684242,
      filename: "/usr/local/share/vim/syntax/slice.vim"
    }, {
      start: 5684242,
      audio: 0,
      end: 5684370,
      filename: "/usr/local/share/vim/syntax/hostsaccess.vim"
    }, {
      start: 5684370,
      audio: 0,
      end: 5687158,
      filename: "/usr/local/share/vim/syntax/typescriptreact.vim"
    }, {
      start: 5687158,
      audio: 0,
      end: 5695555,
      filename: "/usr/local/share/vim/syntax/monk.vim"
    }, {
      start: 5695555,
      audio: 0,
      end: 5695936,
      filename: "/usr/local/share/vim/syntax/icemenu.vim"
    }, {
      start: 5695936,
      audio: 0,
      end: 5700488,
      filename: "/usr/local/share/vim/syntax/teraterm.vim"
    }, {
      start: 5700488,
      audio: 0,
      end: 5701383,
      filename: "/usr/local/share/vim/syntax/udevconf.vim"
    }, {
      start: 5701383,
      audio: 0,
      end: 5702369,
      filename: "/usr/local/share/vim/syntax/man.vim"
    }, {
      start: 5702369,
      audio: 0,
      end: 5739733,
      filename: "/usr/local/share/vim/syntax/sh.vim"
    }, {
      start: 5739733,
      audio: 0,
      end: 5741130,
      filename: "/usr/local/share/vim/syntax/sieve.vim"
    }, {
      start: 5741130,
      audio: 0,
      end: 5743063,
      filename: "/usr/local/share/vim/syntax/hb.vim"
    }, {
      start: 5743063,
      audio: 0,
      end: 5744448,
      filename: "/usr/local/share/vim/syntax/takout.vim"
    }, {
      start: 5744448,
      audio: 0,
      end: 5744860,
      filename: "/usr/local/share/vim/syntax/xbl.vim"
    }, {
      start: 5744860,
      audio: 0,
      end: 5756485,
      filename: "/usr/local/share/vim/syntax/ldapconf.vim"
    }, {
      start: 5756485,
      audio: 0,
      end: 5833509,
      filename: "/usr/local/share/vim/syntax/neomuttrc.vim"
    }, {
      start: 5833509,
      audio: 0,
      end: 5838327,
      filename: "/usr/local/share/vim/syntax/smil.vim"
    }, {
      start: 5838327,
      audio: 0,
      end: 5842383,
      filename: "/usr/local/share/vim/syntax/yacc.vim"
    }, {
      start: 5842383,
      audio: 0,
      end: 5843570,
      filename: "/usr/local/share/vim/syntax/tssop.vim"
    }, {
      start: 5843570,
      audio: 0,
      end: 5886337,
      filename: "/usr/local/share/vim/syntax/hollywood.vim"
    }, {
      start: 5886337,
      audio: 0,
      end: 5889739,
      filename: "/usr/local/share/vim/syntax/flexwiki.vim"
    }, {
      start: 5889739,
      audio: 0,
      end: 5904261,
      filename: "/usr/local/share/vim/syntax/fstab.vim"
    }, {
      start: 5904261,
      audio: 0,
      end: 5923566,
      filename: "/usr/local/share/vim/syntax/gnuplot.vim"
    }, {
      start: 5923566,
      audio: 0,
      end: 5929812,
      filename: "/usr/local/share/vim/syntax/lynx.vim"
    }, {
      start: 5929812,
      audio: 0,
      end: 5930774,
      filename: "/usr/local/share/vim/syntax/robots.vim"
    }, {
      start: 5930774,
      audio: 0,
      end: 5940905,
      filename: "/usr/local/share/vim/syntax/cobol.vim"
    }, {
      start: 5940905,
      audio: 0,
      end: 5953836,
      filename: "/usr/local/share/vim/syntax/hamster.vim"
    }, {
      start: 5953836,
      audio: 0,
      end: 5967309,
      filename: "/usr/local/share/vim/syntax/openroad.vim"
    }, {
      start: 5967309,
      audio: 0,
      end: 6000566,
      filename: "/tutor"
    }, {
      start: 6000566,
      audio: 0,
      end: 6004789,
      filename: "/home/web_user/tryit.js"
    }, {
      start: 6004789, // 6004740 6004782 6009520
      audio: 0,
      end: 6013655, // 6013605, 6018386 end of file
      filename: "/home/web_user/README.md"
    }],
  remote_package_size: 6013606,
  package_uuid: "91e5435b-d279-4ed8-862d-71deab5b0add"
})
})();

function stdin() {
  return null
}
debug = function(arguments) {};
// debug = console.log;
emscriptenRuntimeInitialized = new Promise(function(resolve) {
  Module.onRuntimeInitialized = resolve
});
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key]
  }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function(status, toThrow) {
  throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_HAS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_HAS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";

function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory)
  }
  return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + "/";
  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require("fs");
    if (!nodePath) nodePath = require("path");
    filename = nodePath["normalize"](filename);
    return nodeFS["readFileSync"](filename, binary ? null : "utf8")
  };
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret)
    }
    assert(ret.buffer);
    return ret
  };
  if (process["argv"].length > 1) {
    thisProgram = process["argv"][1].replace(/\\/g, "/")
  }
  arguments_ = process["argv"].slice(2);
  if (typeof module !== "undefined") {
    module["exports"] = Module
  }
  process["on"]("uncaughtException", function(ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex
    }
  });
  process["on"]("unhandledRejection", abort);
  quit_ = function(status) {
    process["exit"](status)
  };
  Module["inspect"] = function() {
    return "[Emscripten Module object]"
  }
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != "undefined") {
    read_ = function shell_read(f) {
      return read(f)
    }
  }
  readBinary = function readBinary(f) {
    var data;
    if (typeof readbuffer === "function") {
      return new Uint8Array(readbuffer(f))
    }
    data = read(f, "binary");
    assert(typeof data === "object");
    return data
  };
  if (typeof scriptArgs != "undefined") {
    arguments_ = scriptArgs
  } else if (typeof arguments != "undefined") {
    arguments_ = arguments
  }
  if (typeof quit === "function") {
    quit_ = function(status) {
      quit(status)
    }
  }
  if (typeof print !== "undefined") {
    if (typeof console === "undefined") console = {};
    console.log = print;
    console.warn = console.error = typeof printErr !== "undefined" ? printErr : print
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href
  } else if (document.currentScript) {
    scriptDirectory = document.currentScript.src
  }
  if (scriptDirectory.indexOf("blob:") !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)
  } else {
    scriptDirectory = ""
  } {
    read_ = function shell_read(url) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function readBinary(url) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response)
      }
    }
    readAsync = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
          onload(xhr.response);
          return
        }
        onerror()
      };
      xhr.onerror = onerror;
      xhr.send(null)
    }
  }
  setWindowTitle = function(title) {
    document.title = title
  }
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key]
  }
}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];

function dynamicAlloc(size) {
  var ret = HEAP32[DYNAMICTOP_PTR >> 2];
  var end = ret + size + 15 & -16;
  if (end > _emscripten_get_heap_size()) {
    abort()
  }
  HEAP32[DYNAMICTOP_PTR >> 2] = end;
  return ret
}

function getNativeTypeSize(type) {
  switch (type) {
    case "i1":
    case "i8":
      return 1;
    case "i16":
      return 2;
    case "i32":
      return 4;
    case "i64":
      return 8;
    case "float":
      return 4;
    case "double":
      return 8;
    default: {
      if (type[type.length - 1] === "*") {
        return 4
      } else if (type[0] === "i") {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
        return bits / 8
      } else {
        return 0
      }
    }
  }
}
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime;
if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
if (typeof WebAssembly !== "object") {
  err("no native wasm support detected")
}

function setValue(ptr, value, type, noSafe) {
  type = type || "i8";
  if (type.charAt(type.length - 1) === "*") type = "i32";
  switch (type) {
    case "i1":
      HEAP8[ptr >> 0] = value;
      break;
    case "i8":
      HEAP8[ptr >> 0] = value;
      break;
    case "i16":
      HEAP16[ptr >> 1] = value;
      break;
    case "i32":
      HEAP32[ptr >> 2] = value;
      break;
    case "i64":
      tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
      break;
    case "float":
      HEAPF32[ptr >> 2] = value;
      break;
    case "double":
      HEAPF64[ptr >> 3] = value;
      break;
    default:
      abort("invalid type for setValue: " + type)
  }
}
var wasmMemory;
var wasmTable = new WebAssembly.Table({
  initial: 869,
  maximum: 869 + 0,
  element: "anyfunc"
});
var ABORT = false;
var EXITSTATUS = 0;

function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed: " + text)
  }
}

function getCFunc(ident) {
  var func = Module["_" + ident];
  assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
  return func
}

function ccall(ident, returnType, argTypes, args, opts) {
  var toC = {
    string: function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len)
      }
      return ret
    },
    array: function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret
    }
  };

  function convertReturnValue(ret) {
    if (returnType === "string") return UTF8ToString(ret);
    if (returnType === "boolean") return Boolean(ret);
    return ret
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i])
      } else {
        cArgs[i] = args[i]
      }
    }
  }
  var ret = func.apply(null, cArgs);
  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret
}

function cwrap(ident, returnType, argTypes, opts) {
  argTypes = argTypes || [];
  var numericArgs = argTypes.every(function(type) {
    return type === "number"
  });
  var numericRet = returnType !== "string";
  if (numericRet && numericArgs && !opts) {
    return getCFunc(ident)
  }
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts)
  }
}
var ALLOC_NORMAL = 0;
var ALLOC_NONE = 3;

function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === "number") {
    zeroinit = true;
    size = slab
  } else {
    zeroinit = false;
    size = slab.length
  }
  var singleType = typeof types === "string" ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr
  } else {
    ret = [_malloc, stackAlloc, dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length))
  }
  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[ptr >> 2] = 0
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[ptr++ >> 0] = 0
    }
    return ret
  }
  if (singleType === "i8") {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret)
    } else {
      HEAPU8.set(new Uint8Array(slab), ret)
    }
    return ret
  }
  var i = 0,
    type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue
    }
    if (type == "i64") type = "i32";
    setValue(ret + i, curr, type);
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type
    }
    i += typeSize
  }
  return ret
}

function getMemory(size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size)
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
  } else {
    var str = "";
    while (idx < endPtr) {
      var u0 = u8Array[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue
      }
      var u1 = u8Array[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue
      }
      var u2 = u8Array[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u8Array[idx++] & 63
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0)
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
      }
    }
  }
  return str
}

function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
}

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | u1 & 1023
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 192 | u >> 6;
      outU8Array[outIdx++] = 128 | u & 63
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 224 | u >> 12;
      outU8Array[outIdx++] = 128 | u >> 6 & 63;
      outU8Array[outIdx++] = 128 | u & 63
    } else {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 240 | u >> 18;
      outU8Array[outIdx++] = 128 | u >> 12 & 63;
      outU8Array[outIdx++] = 128 | u >> 6 & 63;
      outU8Array[outIdx++] = 128 | u & 63
    }
  }
  outU8Array[outIdx] = 0;
  return outIdx - startIdx
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
    if (u <= 127) ++len;
    else if (u <= 2047) len += 2;
    else if (u <= 65535) len += 3;
    else len += 4
  }
  return len
}
var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer)
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++ >> 0] = str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[buffer >> 0] = 0
}
var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - x % multiple
  }
  return x
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module["HEAP8"] = HEAP8 = new Int8Array(buf);
  Module["HEAP16"] = HEAP16 = new Int16Array(buf);
  Module["HEAP32"] = HEAP32 = new Int32Array(buf);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}
var DYNAMIC_BASE = 5490864,
  DYNAMICTOP_PTR = 247824;
var INITIAL_TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
if (Module["wasmMemory"]) {
  wasmMemory = Module["wasmMemory"]
} else {
  wasmMemory = new WebAssembly.Memory({
    initial: INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
  })
}
if (wasmMemory) {
  buffer = wasmMemory.buffer
}
INITIAL_TOTAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;

function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == "function") {
      callback();
      continue
    }
    var func = callback.func;
    if (typeof func === "number") {
      if (callback.arg === undefined) {
        Module["dynCall_v"](func)
      } else {
        Module["dynCall_vi"](func, callback.arg)
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg)
    }
  }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift())
    }
  }
  callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime() {
  runtimeInitialized = true;
  if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
  TTY.init();
  callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
  FS.ignorePermissions = false;
  callRuntimeCallbacks(__ATMAIN__)
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  FS.quit();
  TTY.shutdown();
  runtimeExited = true
}

function postRun() {
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift())
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb)
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb)
}
var Math_abs = Math.abs;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_min = Math.min;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
  return id
}

function addRunDependency(id) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies)
  }
}

function removeRunDependency(id) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies)
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback()
    }
  }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};

function abort(what) {
  if (Module["onAbort"]) {
    Module["onAbort"](what)
  }
  what += "";
  out(what);
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
  throw new WebAssembly.RuntimeError(what)
}
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
  return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0
}
var wasmBinaryFile = "vim.wasm";
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile)
}

function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary)
    }
    if (readBinary) {
      return readBinary(wasmBinaryFile)
    } else {
      throw "both async and sync fetching of the wasm failed"
    }
  } catch (err) {
    abort(err)
  }
}

function getBinaryPromise() {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
    return fetch(wasmBinaryFile, {
      credentials: "same-origin"
    }).then(function(response) {
      if (!response["ok"]) {
        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
      }
      return response["arrayBuffer"]()
    }).catch(function() {
      return getBinary()
    })
  }
  return new Promise(function(resolve, reject) {
    resolve(getBinary())
  })
}

function createWasm() {
  var info = {
    env: asmLibraryArg,
    wasi_snapshot_preview1: asmLibraryArg
  };

  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module["asm"] = exports;
    removeRunDependency("wasm-instantiate")
  }
  addRunDependency("wasm-instantiate");

  function receiveInstantiatedSource(output) {
    receiveInstance(output["instance"])
  }

  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info)
    }).then(receiver, function(reason) {
      err("failed to asynchronously prepare wasm: " + reason);
      abort(reason)
    })
  }

  function instantiateAsync() {
    if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
      fetch(wasmBinaryFile, {
        credentials: "same-origin"
      }).then(function(response) {
        var result = WebAssembly.instantiateStreaming(response, info);
        return result.then(receiveInstantiatedSource, function(reason) {
          err("wasm streaming compile failed: " + reason);
          err("falling back to ArrayBuffer instantiation");
          instantiateArrayBuffer(receiveInstantiatedSource)
        })
      })
    } else {
      return instantiateArrayBuffer(receiveInstantiatedSource)
    }
  }
  if (Module["instantiateWasm"]) {
    try {
      var exports = Module["instantiateWasm"](info, receiveInstance);
      return exports
    } catch (e) {
      err("Module.instantiateWasm callback failed with error: " + e);
      return false
    }
  }
  instantiateAsync();
  return {}
}
var tempDouble;
var tempI64;
__ATINIT__.push({
  func: function() {
    ___wasm_call_ctors()
  }
});

function demangle(func) {
  return func
}

function demangleAll(text) {
  var regex = /\b_Z[\w\d_]+/g;
  return text.replace(regex, function(x) {
    var y = demangle(x);
    return x === y ? x : y + " [" + x + "]"
  })
}

function jsStackTrace() {
  var err = new Error;
  if (!err.stack) {
    try {
      throw new Error(0)
    } catch (e) {
      err = e
    }
    if (!err.stack) {
      return "(no stack trace available)"
    }
  }
  return err.stack.toString()
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
  return demangleAll(js)
}

function ___assert_fail(condition, filename, line, func) {
  abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"])
}

function _emscripten_get_now() {
  abort()
}

function _emscripten_get_now_is_monotonic() {
  return 0 || ENVIRONMENT_IS_NODE || typeof dateNow !== "undefined" || 1
}

function ___setErrNo(value) {
  if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
  return value
}

function _clock_gettime(clk_id, tp) {
  var now;
  if (clk_id === 0) {
    now = Date.now()
  } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
    now = _emscripten_get_now()
  } else {
    ___setErrNo(28);
    return -1
  }
  HEAP32[tp >> 2] = now / 1e3 | 0;
  HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
  return 0
}

function ___clock_gettime(a0, a1) {
  return _clock_gettime(a0, a1)
}

function ___lock() {}

function ___map_file(pathname, size) {
  ___setErrNo(63);
  return -1
}
var PATH = {
  splitPath: function(filename) {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1)
  },
  normalizeArray: function(parts, allowAboveRoot) {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1)
      } else if (last === "..") {
        parts.splice(i, 1);
        up++
      } else if (up) {
        parts.splice(i, 1);
        up--
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift("..")
      }
    }
    return parts
  },
  normalize: function(path) {
    var isAbsolute = path.charAt(0) === "/",
      trailingSlash = path.substr(-1) === "/";
    path = PATH.normalizeArray(path.split("/").filter(function(p) {
      return !!p
    }), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = "."
    }
    if (path && trailingSlash) {
      path += "/"
    }
    return (isAbsolute ? "/" : "") + path
  },
  dirname: function(path) {
    var result = PATH.splitPath(path),
      root = result[0],
      dir = result[1];
    if (!root && !dir) {
      return "."
    }
    if (dir) {
      dir = dir.substr(0, dir.length - 1)
    }
    return root + dir
  },
  basename: function(path) {
    if (path === "/") return "/";
    var lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) return path;
    return path.substr(lastSlash + 1)
  },
  extname: function(path) {
    return PATH.splitPath(path)[3]
  },
  join: function() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return PATH.normalize(paths.join("/"))
  },
  join2: function(l, r) {
    return PATH.normalize(l + "/" + r)
  }
};
var PATH_FS = {
  resolve: function() {
    var resolvedPath = "",
      resolvedAbsolute = false;
    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? arguments[i] : FS.cwd();
      if (typeof path !== "string") {
        throw new TypeError("Arguments to path.resolve must be strings")
      } else if (!path) {
        return ""
      }
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = path.charAt(0) === "/"
    }
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
      return !!p
    }), !resolvedAbsolute).join("/");
    return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
  },
  relative: function(from, to) {
    from = PATH_FS.resolve(from).substr(1);
    to = PATH_FS.resolve(to).substr(1);

    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== "") break
      }
      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== "") break
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1)
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..")
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/")
  }
};
var TTY = {
  ttys: [],
  init: function() {},
  shutdown: function() {},
  register: function(dev, ops) {
    TTY.ttys[dev] = {
      input: [],
      output: [],
      ops: ops
    };
    FS.registerDevice(dev, TTY.stream_ops)
  },
  stream_ops: {
    open: function(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43)
      }
      stream.tty = tty;
      stream.seekable = false
    },
    close: function(stream) {
      stream.tty.ops.flush(stream.tty)
    },
    flush: function(stream) {
      stream.tty.ops.flush(stream.tty)
    },
    read: function(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60)
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty)
        } catch (e) {
          throw new FS.ErrnoError(29)
        }
        if (result === undefined && bytesRead === 0) {
          throw new FS.ErrnoError(6)
        }
        if (result === null || result === undefined) break;
        bytesRead++;
        buffer[offset + i] = result
      }
      if (bytesRead) {
        stream.node.timestamp = Date.now()
      }
      return bytesRead
    },
    write: function(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60)
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i])
        }
      } catch (e) {
        throw new FS.ErrnoError(29)
      }
      if (length) {
        stream.node.timestamp = Date.now()
      }
      return i
    }
  },
  default_tty_ops: {
    get_char: function(tty) {
      if (!tty.input.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
          var bytesRead = 0;
          try {
            bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null)
          } catch (e) {
            if (e.toString().indexOf("EOF") != -1) bytesRead = 0;
            else throw e
          }
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString("utf-8")
          } else {
            result = null
          }
        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n"
          }
        } else if (typeof readline == "function") {
          result = readline();
          if (result !== null) {
            result += "\n"
          }
        }
        if (!result) {
          return null
        }
        tty.input = intArrayFromString(result, true)
      }
      return tty.input.shift()
    },
    put_char: function(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      } else {
        if (val != 0) tty.output.push(val)
      }
    },
    flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      }
    }
  },
  default_tty1_ops: {
    put_char: function(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      } else {
        if (val != 0) tty.output.push(val)
      }
    },
    flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = []
      }
    }
  }
};
var MEMFS = {
  ops_table: null,
  mount: function(mount) {
    return MEMFS.createNode(null, "/", 16384 | 511, 0)
  },
  createNode: function(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      throw new FS.ErrnoError(63)
    }
    if (!MEMFS.ops_table) {
      MEMFS.ops_table = {
        dir: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink
          },
          stream: {
            llseek: MEMFS.stream_ops.llseek
          }
        },
        file: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            allocate: MEMFS.stream_ops.allocate,
            mmap: MEMFS.stream_ops.mmap,
            msync: MEMFS.stream_ops.msync
          }
        },
        link: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink
          },
          stream: {}
        },
        chrdev: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: FS.chrdev_stream_ops
        }
      }
    }
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {}
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      node.contents = null
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream
    }
    node.timestamp = Date.now();
    if (parent) {
      parent.contents[name] = node
    }
    return node
  },
  getFileDataAsRegularArray: function(node) {
    if (node.contents && node.contents.subarray) {
      var arr = [];
      for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
      return arr
    }
    return node.contents
  },
  getFileDataAsTypedArray: function(node) {
    if (!node.contents) return new Uint8Array;
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
    return new Uint8Array(node.contents)
  },
  expandFileStorage: function(node, newCapacity) {
    var prevCapacity = node.contents ? node.contents.length : 0;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
    var oldContents = node.contents;
    node.contents = new Uint8Array(newCapacity);
    if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
    return
  },
  resizeFileStorage: function(node, newSize) {
    if (node.usedBytes == newSize) return;
    if (newSize == 0) {
      node.contents = null;
      node.usedBytes = 0;
      return
    }
    if (!node.contents || node.contents.subarray) {
      var oldContents = node.contents;
      node.contents = new Uint8Array(new ArrayBuffer(newSize));
      if (oldContents) {
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
      }
      node.usedBytes = newSize;
      return
    }
    if (!node.contents) node.contents = [];
    if (node.contents.length > newSize) node.contents.length = newSize;
    else
      while (node.contents.length < newSize) node.contents.push(0);
    node.usedBytes = newSize
  },
  node_ops: {
    getattr: function(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length
      } else {
        attr.size = 0
      }
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr
    },
    setattr: function(node, attr) {
      if (attr.mode !== undefined) {
        node.mode = attr.mode
      }
      if (attr.timestamp !== undefined) {
        node.timestamp = attr.timestamp
      }
      if (attr.size !== undefined) {
        MEMFS.resizeFileStorage(node, attr.size)
      }
    },
    lookup: function(parent, name) {
      throw FS.genericErrors[44]
    },
    mknod: function(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev)
    },
    rename: function(old_node, new_dir, new_name) {
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (new_node) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55)
          }
        }
      }
      delete old_node.parent.contents[old_node.name];
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      old_node.parent = new_dir
    },
    unlink: function(parent, name) {
      delete parent.contents[name]
    },
    rmdir: function(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55)
      }
      delete parent.contents[name]
    },
    readdir: function(node) {
      var entries = [".", ".."];
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue
        }
        entries.push(key)
      }
      return entries
    },
    symlink: function(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node
    },
    readlink: function(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28)
      }
      return node.link
    }
  },
  stream_ops: {
    read: function(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        buffer.set(contents.subarray(position, position + size), offset)
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
      }
      return size
    },
    write: function(stream, buffer, offset, length, position, canOwn) {
      if (buffer.buffer === HEAP8.buffer) {
        canOwn = false
      }
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
          node.usedBytes = length;
          return length
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length
        }
      }
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
      else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer[offset + i]
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length
    },
    llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28)
      }
      return position
    },
    allocate: function(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
    },
    mmap: function(stream, buffer, offset, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43)
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags & 2) && contents.buffer === buffer.buffer) {
        allocated = false;
        ptr = contents.byteOffset
      } else {
        if (position > 0 || position + length < stream.node.usedBytes) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length)
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length)
          }
        }
        allocated = true;
        var fromHeap = buffer.buffer == HEAP8.buffer;
        ptr = _malloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48)
        }(fromHeap ? HEAP8 : buffer).set(contents, ptr)
      }
      return {
        ptr: ptr,
        allocated: allocated
      }
    },
    msync: function(stream, buffer, offset, length, mmapFlags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43)
      }
      if (mmapFlags & 2) {
        return 0
      }
      var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      return 0
    }
  }
};
var IDBFS = {
  dbs: {},
  indexedDB: function() {
    if (typeof indexedDB !== "undefined") return indexedDB;
    var ret = null;
    if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    assert(ret, "IDBFS used, but indexedDB not supported");
    return ret
  },
  DB_VERSION: 21,
  DB_STORE_NAME: "FILE_DATA",
  mount: function(mount) {
    return MEMFS.mount.apply(null, arguments)
  },
  syncfs: function(mount, populate, callback) {
    IDBFS.getLocalSet(mount, function(err, local) {
      if (err) return callback(err);
      IDBFS.getRemoteSet(mount, function(err, remote) {
        if (err) return callback(err);
        var src = populate ? remote : local;
        var dst = populate ? local : remote;
        IDBFS.reconcile(src, dst, callback)
      })
    })
  },
  getDB: function(name, callback) {
    var db = IDBFS.dbs[name];
    console.log('d3 dbs', IDBFS.dbs, name, db);
    if (db) {
      return callback(null, db)
    }
    var req;
    try {
      req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
    } catch (e) {
      return callback(e)
    }
    if (!req) {
      return callback("Unable to connect to IndexedDB")
    }
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      var transaction = e.target.transaction;
      var fileStore;
      if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
        fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
      } else {
        fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
      }
      if (!fileStore.indexNames.contains("timestamp")) {
        fileStore.createIndex("timestamp", "timestamp", {
          unique: false
        })
      }
    };
    req.onsuccess = function() {
      db = req.result;
      IDBFS.dbs[name] = db;
      callback(null, db)
    };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  getLocalSet: function(mount, callback) {
    var entries = {};

    function isRealDir(p) {
      return p !== "." && p !== ".."
    }

    function toAbsolute(root) {
      return function(p) {
        return PATH.join2(root, p)
      }
    }
    var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
    while (check.length) {
      var path = check.pop();
      var stat;
      try {
        stat = FS.stat(path)
      } catch (e) {
        return callback(e)
      }
      if (FS.isDir(stat.mode)) {
        check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
      }
      entries[path] = {
        timestamp: stat.mtime
      }
    }
    return callback(null, {
      type: "local",
      entries: entries
    })
  },
  getRemoteSet: function(mount, callback) {
    var entries = {};
    IDBFS.getDB(mount.mountpoint, function(err, db) {
      if (err) return callback(err);
      try {
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
        transaction.onerror = function(e) {
          callback(this.error);
          e.preventDefault()
        };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        var index = store.index("timestamp");
        var cursor = index.openKeyCursor();
        cursor.onsuccess = function(event) {
          var cursor = event.target.result;
          if (!cursor) {
            return callback(null, {
              type: "remote",
              db: db,
              entries: entries
            })
          }
          entries[cursor.primaryKey] = {
            timestamp: cursor.key
          };
          cursor.continue()
        }
        cursor.onerror = function(event) {
          console.log('cursor error:', event);
        }
      } catch (e) {
        return callback(e)
      }
    })
  },
  loadLocalEntry: function(path, callback) {
    var stat, node;
    try {
      var lookup = FS.lookupPath(path);
      node = lookup.node;
      stat = FS.stat(path)
    } catch (e) {
      return callback(e)
    }
    if (FS.isDir(stat.mode)) {
      return callback(null, {
        timestamp: stat.mtime,
        mode: stat.mode
      })
    } else if (FS.isFile(stat.mode)) {
      node.contents = MEMFS.getFileDataAsTypedArray(node);
      return callback(null, {
        timestamp: stat.mtime,
        mode: stat.mode,
        contents: node.contents
      })
    } else {
      return callback(new Error("node type not supported"))
    }
  },
  storeLocalEntry: function(path, entry, callback) {
    try {
      if (FS.isDir(entry.mode)) {
        FS.mkdir(path, entry.mode)
      } else if (FS.isFile(entry.mode)) {
        FS.writeFile(path, entry.contents, {
          canOwn: true
        })
      } else {
        return callback(new Error("node type not supported"))
      }
      FS.chmod(path, entry.mode);
      FS.utime(path, entry.timestamp, entry.timestamp)
    } catch (e) {
      return callback(e)
    }
    callback(null)
  },
  removeLocalEntry: function(path, callback) {
    try {
      var lookup = FS.lookupPath(path);
      var stat = FS.stat(path);
      if (FS.isDir(stat.mode)) {
        FS.rmdir(path)
      } else if (FS.isFile(stat.mode)) {
        FS.unlink(path)
      }
    } catch (e) {
      return callback(e)
    }
    callback(null)
  },
  loadRemoteEntry: function(store, path, callback) {
    var req = store.get(path);
    req.onsuccess = function(event) {
      callback(null, event.target.result)
    };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  storeRemoteEntry: function(store, path, entry, callback) {
    var req = store.put(entry, path);
    req.onsuccess = function() {
      callback(null)
    };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  removeRemoteEntry: function(store, path, callback) {
    var req = store.delete(path);
    req.onsuccess = function() {
      callback(null)
    };
    req.onerror = function(e) {
      callback(this.error);
      e.preventDefault()
    }
  },
  reconcile: function(src, dst, callback) {
    var total = 0;
    var create = [];
    Object.keys(src.entries).forEach(function(key) {
      var e = src.entries[key];
      var e2 = dst.entries[key];
      if (!e2 || e.timestamp > e2.timestamp) {
        create.push(key);
        total++
      }
    });
    var remove = [];
    Object.keys(dst.entries).forEach(function(key) {
      var e = dst.entries[key];
      var e2 = src.entries[key];
      if (!e2) {
        remove.push(key);
        total++
      }
    });
    if (!total) {
      return callback(null)
    }
    var errored = false;
    var db = src.type === "remote" ? src.db : dst.db;
    var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

    function done(err) {
      if (err && !errored) {
        errored = true;
        return callback(err)
      }
    }
    transaction.onerror = function(e) {
      done(this.error);
      e.preventDefault()
    };
    transaction.oncomplete = function(e) {
      if (!errored) {
        callback(null)
      }
    };
    create.sort().forEach(function(path) {
      if (dst.type === "local") {
        IDBFS.loadRemoteEntry(store, path, function(err, entry) {
          if (err) return done(err);
          IDBFS.storeLocalEntry(path, entry, done)
        })
      } else {
        IDBFS.loadLocalEntry(path, function(err, entry) {
          if (err) return done(err);
          IDBFS.storeRemoteEntry(store, path, entry, done)
        })
      }
    });
    remove.sort().reverse().forEach(function(path) {
      if (dst.type === "local") {
        IDBFS.removeLocalEntry(path, done)
      } else {
        IDBFS.removeRemoteEntry(store, path, done)
      }
    })
  }
};
var FS = {
  root: null,
  mounts: [],
  devices: {},
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: "/home/web_user",
  initialized: false,
  ignorePermissions: true,
  trackingDelegate: {},
  tracking: {
    openFlags: {
      READ: 1,
      WRITE: 2
    }
  },
  ErrnoError: null,
  genericErrors: {},
  filesystems: null,
  syncFSRequests: 0,
  handleFSError: function(e) {
    if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
    return ___setErrNo(e.errno)
  },
  lookupPath: function(path, opts) {
    path = PATH_FS.resolve(FS.cwd(), path);
    opts = opts || {};
    if (!path) return {
      path: "",
      node: null
    };
    var defaults = {
      follow_mount: true,
      recurse_count: 0
    };
    for (var key in defaults) {
      if (opts[key] === undefined) {
        opts[key] = defaults[key]
      }
    }
    if (opts.recurse_count > 8) {
      throw new FS.ErrnoError(32)
    }
    var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
      return !!p
    }), false);
    var current = FS.root;
    var current_path = "/";
    for (var i = 0; i < parts.length; i++) {
      var islast = i === parts.length - 1;
      if (islast && opts.parent) {
        break
      }
      current = FS.lookupNode(current, parts[i]);
      current_path = PATH.join2(current_path, parts[i]);
      if (FS.isMountpoint(current)) {
        if (!islast || islast && opts.follow_mount) {
          current = current.mounted.root
        }
      }
      if (!islast || opts.follow) {
        var count = 0;
        while (FS.isLink(current.mode)) {
          var link = FS.readlink(current_path);
          current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
          var lookup = FS.lookupPath(current_path, {
            recurse_count: opts.recurse_count
          });
          current = lookup.node;
          if (count++ > 40) {
            throw new FS.ErrnoError(32)
          }
        }
      }
    }
    return {
      path: current_path,
      node: current
    }
  },
  getPath: function(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
      }
      path = path ? node.name + "/" + path : node.name;
      node = node.parent
    }
  },
  hashName: function(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i) | 0
    }
    return (parentid + hash >>> 0) % FS.nameTable.length
  },
  hashAddNode: function(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node
  },
  hashRemoveNode: function(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break
        }
        current = current.name_next
      }
    }
  },
  lookupNode: function(parent, name) {
    var err = FS.mayLookup(parent);
    if (err) {
      throw new FS.ErrnoError(err, parent)
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node
      }
    }
    return FS.lookup(parent, name)
  },
  createNode: function(parent, name, mode, rdev) {
    if (!FS.FSNode) {
      FS.FSNode = function(parent, name, mode, rdev) {
        if (!parent) {
          parent = this
        }
        this.parent = parent;
        this.mount = parent.mount;
        this.mounted = null;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode;
        this.node_ops = {};
        this.stream_ops = {};
        this.rdev = rdev
      };
      FS.FSNode.prototype = {};
      var readMode = 292 | 73;
      var writeMode = 146;
      Object.defineProperties(FS.FSNode.prototype, {
        read: {
          get: function() {
            return (this.mode & readMode) === readMode
          },
          set: function(val) {
            val ? this.mode |= readMode : this.mode &= ~readMode
          }
        },
        write: {
          get: function() {
            return (this.mode & writeMode) === writeMode
          },
          set: function(val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode
          }
        },
        isFolder: {
          get: function() {
            return FS.isDir(this.mode)
          }
        },
        isDevice: {
          get: function() {
            return FS.isChrdev(this.mode)
          }
        }
      })
    }
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node
  },
  destroyNode: function(node) {
    FS.hashRemoveNode(node)
  },
  isRoot: function(node) {
    return node === node.parent
  },
  isMountpoint: function(node) {
    return !!node.mounted
  },
  isFile: function(mode) {
    return (mode & 61440) === 32768
  },
  isDir: function(mode) {
    return (mode & 61440) === 16384
  },
  isLink: function(mode) {
    return (mode & 61440) === 40960
  },
  isChrdev: function(mode) {
    return (mode & 61440) === 8192
  },
  isBlkdev: function(mode) {
    return (mode & 61440) === 24576
  },
  isFIFO: function(mode) {
    return (mode & 61440) === 4096
  },
  isSocket: function(mode) {
    return (mode & 49152) === 49152
  },
  flagModes: {
    r: 0,
    rs: 1052672,
    "r+": 2,
    w: 577,
    wx: 705,
    xw: 705,
    "w+": 578,
    "wx+": 706,
    "xw+": 706,
    a: 1089,
    ax: 1217,
    xa: 1217,
    "a+": 1090,
    "ax+": 1218,
    "xa+": 1218
  },
  modeStringToFlags: function(str) {
    var flags = FS.flagModes[str];
    if (typeof flags === "undefined") {
      throw new Error("Unknown file open mode: " + str)
    }
    return flags
  },
  flagsToPermissionString: function(flag) {
    var perms = ["r", "w", "rw"][flag & 3];
    if (flag & 512) {
      perms += "w"
    }
    return perms
  },
  nodePermissions: function(node, perms) {
    if (FS.ignorePermissions) {
      return 0
    }
    if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
      return 2
    } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
      return 2
    } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
      return 2
    }
    return 0
  },
  mayLookup: function(dir) {
    var err = FS.nodePermissions(dir, "x");
    if (err) return err;
    if (!dir.node_ops.lookup) return 2;
    return 0
  },
  mayCreate: function(dir, name) {
    try {
      var node = FS.lookupNode(dir, name);
      return 20
    } catch (e) {}
    return FS.nodePermissions(dir, "wx")
  },
  mayDelete: function(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name)
    } catch (e) {
      return e.errno
    }
    var err = FS.nodePermissions(dir, "wx");
    if (err) {
      return err
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10
      }
    } else {
      if (FS.isDir(node.mode)) {
        return 31
      }
    }
    return 0
  },
  mayOpen: function(node, flags) {
    if (!node) {
      return 44
    }
    if (FS.isLink(node.mode)) {
      return 32
    } else if (FS.isDir(node.mode)) {
      if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
        return 31
      }
    }
    return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
  },
  MAX_OPEN_FDS: 4096,
  nextfd: function(fd_start, fd_end) {
    fd_start = fd_start || 0;
    fd_end = fd_end || FS.MAX_OPEN_FDS;
    for (var fd = fd_start; fd <= fd_end; fd++) {
      if (!FS.streams[fd]) {
        return fd
      }
    }
    throw new FS.ErrnoError(33)
  },
  getStream: function(fd) {
    return FS.streams[fd]
  },
  createStream: function(stream, fd_start, fd_end) {
    if (!FS.FSStream) {
      FS.FSStream = function() {};
      FS.FSStream.prototype = {};
      Object.defineProperties(FS.FSStream.prototype, {
        object: {
          get: function() {
            return this.node
          },
          set: function(val) {
            this.node = val
          }
        },
        isRead: {
          get: function() {
            return (this.flags & 2097155) !== 1
          }
        },
        isWrite: {
          get: function() {
            return (this.flags & 2097155) !== 0
          }
        },
        isAppend: {
          get: function() {
            return this.flags & 1024
          }
        }
      })
    }
    var newStream = new FS.FSStream;
    for (var p in stream) {
      newStream[p] = stream[p]
    }
    stream = newStream;
    var fd = FS.nextfd(fd_start, fd_end);
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream
  },
  closeStream: function(fd) {
    FS.streams[fd] = null
  },
  chrdev_stream_ops: {
    open: function(stream) {
      var device = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream)
      }
    },
    llseek: function() {
      throw new FS.ErrnoError(70)
    }
  },
  major: function(dev) {
    return dev >> 8
  },
  minor: function(dev) {
    return dev & 255
  },
  makedev: function(ma, mi) {
    return ma << 8 | mi
  },
  registerDevice: function(dev, ops) {
    FS.devices[dev] = {
      stream_ops: ops
    }
  },
  getDevice: function(dev) {
    return FS.devices[dev]
  },
  getMounts: function(mount) {
    var mounts = [];
    var check = [mount];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push.apply(check, m.mounts)
    }
    return mounts
  },
  syncfs: function(populate, callback) {
    if (typeof populate === "function") {
      callback = populate;
      populate = false
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;

    function doCallback(err) {
      FS.syncFSRequests--;
      return callback(err)
    }

    function done(err) {
      if (err) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(err)
        }
        return
      }
      if (++completed >= mounts.length) {
        doCallback(null)
      }
    }
    mounts.forEach(function(mount) {
      if (!mount.type.syncfs) {
        return done(null)
      }
      mount.type.syncfs(mount, populate, done)
    })
  },
  mount: function(type, opts, mountpoint) {
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {
      throw new FS.ErrnoError(10)
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, {
        follow_mount: false
      });
      mountpoint = lookup.path;
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10)
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54)
      }
    }
    var mount = {
      type: type,
      opts: opts,
      mountpoint: mountpoint,
      mounts: []
    };
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      FS.root = mountRoot
    } else if (node) {
      node.mounted = mount;
      if (node.mount) {
        node.mount.mounts.push(mount)
      }
    }
    return mountRoot
  },
  unmount: function(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, {
      follow_mount: false
    });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28)
    }
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    Object.keys(FS.nameTable).forEach(function(hash) {
      var current = FS.nameTable[hash];
      while (current) {
        var next = current.name_next;
        if (mounts.indexOf(current.mount) !== -1) {
          FS.destroyNode(current)
        }
        current = next
      }
    });
    node.mounted = null;
    var idx = node.mount.mounts.indexOf(mount);
    node.mount.mounts.splice(idx, 1)
  },
  lookup: function(parent, name) {
    return parent.node_ops.lookup(parent, name)
  },
  mknod: function(path, mode, dev) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name || name === "." || name === "..") {
      throw new FS.ErrnoError(28)
    }
    var err = FS.mayCreate(parent, name);
    if (err) {
      throw new FS.ErrnoError(err)
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63)
    }
    return parent.node_ops.mknod(parent, name, mode, dev)
  },
  create: function(path, mode) {
    mode = mode !== undefined ? mode : 438;
    mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0)
  },
  mkdir: function(path, mode) {
    mode = mode !== undefined ? mode : 511;
    mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0)
  },
  mkdirTree: function(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var i = 0; i < dirs.length; ++i) {
      if (!dirs[i]) continue;
      d += "/" + dirs[i];
      try {
        FS.mkdir(d, mode)
      } catch (e) {
        if (e.errno != 20) throw e
      }
    }
  },
  mkdev: function(path, mode, dev) {
    if (typeof dev === "undefined") {
      dev = mode;
      mode = 438
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev)
  },
  symlink: function(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44)
    }
    var lookup = FS.lookupPath(newpath, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44)
    }
    var newname = PATH.basename(newpath);
    var err = FS.mayCreate(parent, newname);
    if (err) {
      throw new FS.ErrnoError(err)
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63)
    }
    return parent.node_ops.symlink(parent, newname, oldpath)
  },
  rename: function(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    var lookup, old_dir, new_dir;
    try {
      lookup = FS.lookupPath(old_path, {
        parent: true
      });
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, {
        parent: true
      });
      new_dir = lookup.node
    } catch (e) {
      throw new FS.ErrnoError(10)
    }
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75)
    }
    var old_node = FS.lookupNode(old_dir, old_name);
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28)
    }
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55)
    }
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name)
    } catch (e) {}
    if (old_node === new_node) {
      return
    }
    var isdir = FS.isDir(old_node.mode);
    var err = FS.mayDelete(old_dir, old_name, isdir);
    if (err) {
      throw new FS.ErrnoError(err)
    }
    err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (err) {
      throw new FS.ErrnoError(err)
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
      throw new FS.ErrnoError(10)
    }
    if (new_dir !== old_dir) {
      err = FS.nodePermissions(old_dir, "w");
      if (err) {
        throw new FS.ErrnoError(err)
      }
    }
    try {
      if (FS.trackingDelegate["willMovePath"]) {
        FS.trackingDelegate["willMovePath"](old_path, new_path)
      }
    } catch (e) {
      console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
    }
    FS.hashRemoveNode(old_node);
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name)
    } catch (e) {
      throw e
    } finally {
      FS.hashAddNode(old_node)
    }
    try {
      if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
    } catch (e) {
      console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
    }
  },
  rmdir: function(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var err = FS.mayDelete(parent, name, true);
    if (err) {
      throw new FS.ErrnoError(err)
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10)
    }
    try {
      if (FS.trackingDelegate["willDeletePath"]) {
        FS.trackingDelegate["willDeletePath"](path)
      }
    } catch (e) {
      console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
    try {
      if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
    } catch (e) {
      console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
    }
  },
  readdir: function(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    if (!node.node_ops.readdir) {
      throw new FS.ErrnoError(54)
    }
    return node.node_ops.readdir(node)
  },
  unlink: function(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var err = FS.mayDelete(parent, name, false);
    if (err) {
      throw new FS.ErrnoError(err)
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10)
    }
    try {
      if (FS.trackingDelegate["willDeletePath"]) {
        FS.trackingDelegate["willDeletePath"](path)
      }
    } catch (e) {
      console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
    try {
      if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
    } catch (e) {
      console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
    }
  },
  readlink: function(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44)
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28)
    }
    return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
  },
  stat: function(path, dontFollow) {
    var lookup = FS.lookupPath(path, {
      follow: !dontFollow
    });
    var node = lookup.node;
    if (!node) {
      throw new FS.ErrnoError(44)
    }
    if (!node.node_ops.getattr) {
      throw new FS.ErrnoError(63)
    }
    return node.node_ops.getattr(node)
  },
  lstat: function(path) {
    return FS.stat(path, true)
  },
  chmod: function(path, mode, dontFollow) {
    var node;
    if (typeof path === "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63)
    }
    node.node_ops.setattr(node, {
      mode: mode & 4095 | node.mode & ~4095,
      timestamp: Date.now()
    })
  },
  lchmod: function(path, mode) {
    FS.chmod(path, mode, true)
  },
  fchmod: function(fd, mode) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8)
    }
    FS.chmod(stream.node, mode)
  },
  chown: function(path, uid, gid, dontFollow) {
    var node;
    if (typeof path === "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63)
    }
    node.node_ops.setattr(node, {
      timestamp: Date.now()
    })
  },
  lchown: function(path, uid, gid) {
    FS.chown(path, uid, gid, true)
  },
  fchown: function(fd, uid, gid) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8)
    }
    FS.chown(stream.node, uid, gid)
  },
  truncate: function(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28)
    }
    var node;
    if (typeof path === "string") {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31)
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28)
    }
    var err = FS.nodePermissions(node, "w");
    if (err) {
      throw new FS.ErrnoError(err)
    }
    node.node_ops.setattr(node, {
      size: len,
      timestamp: Date.now()
    })
  },
  ftruncate: function(fd, len) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28)
    }
    FS.truncate(stream.node, len)
  },
  utime: function(path, atime, mtime) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    node.node_ops.setattr(node, {
      timestamp: Math.max(atime, mtime)
    })
  },
  open: function(path, flags, mode, fd_start, fd_end) {
    if (path === "") {
      throw new FS.ErrnoError(44)
    }
    flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
    mode = typeof mode === "undefined" ? 438 : mode;
    if (flags & 64) {
      mode = mode & 4095 | 32768
    } else {
      mode = 0
    }
    var node;
    if (typeof path === "object") {
      node = path
    } else {
      path = PATH.normalize(path);
      try {
        var lookup = FS.lookupPath(path, {
          follow: !(flags & 131072)
        });
        node = lookup.node
      } catch (e) {}
    }
    var created = false;
    if (flags & 64) {
      if (node) {
        if (flags & 128) {
          throw new FS.ErrnoError(20)
        }
      } else {
        node = FS.mknod(path, mode, 0);
        created = true
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44)
    }
    if (FS.isChrdev(node.mode)) {
      flags &= ~512
    }
    if (flags & 65536 && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54)
    }
    if (!created) {
      var err = FS.mayOpen(node, flags);
      if (err) {
        throw new FS.ErrnoError(err)
      }
    }
    if (flags & 512) {
      FS.truncate(node, 0)
    }
    flags &= ~(128 | 512);
    var stream = FS.createStream({
      node: node,
      path: FS.getPath(node),
      flags: flags,
      seekable: true,
      position: 0,
      stream_ops: node.stream_ops,
      ungotten: [],
      error: false
    }, fd_start, fd_end);
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream)
    }
    if (Module["logReadFiles"] && !(flags & 1)) {
      if (!FS.readFiles) FS.readFiles = {};
      if (!(path in FS.readFiles)) {
        FS.readFiles[path] = 1;
        console.log("FS.trackingDelegate error on read file: " + path)
      }
    }
    try {
      if (FS.trackingDelegate["onOpenFile"]) {
        var trackingFlags = 0;
        if ((flags & 2097155) !== 1) {
          trackingFlags |= FS.tracking.openFlags.READ
        }
        if ((flags & 2097155) !== 0) {
          trackingFlags |= FS.tracking.openFlags.WRITE
        }
        FS.trackingDelegate["onOpenFile"](path, trackingFlags)
      }
    } catch (e) {
      console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
    }
    return stream
  },
  close: function(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if (stream.getdents) stream.getdents = null;
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream)
      }
    } catch (e) {
      throw e
    } finally {
      FS.closeStream(stream.fd)
    }
    stream.fd = null
  },
  isClosed: function(stream) {
    return stream.fd === null
  },
  llseek: function(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70)
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28)
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position
  },
  read: function(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28)
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8)
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31)
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28)
    }
    var seeking = typeof position !== "undefined";
    if (!seeking) {
      position = stream.position
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70)
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28)
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8)
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31)
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28)
    }
    if (stream.flags & 1024) {
      FS.llseek(stream, 0, 2)
    }
    var seeking = typeof position !== "undefined";
    if (!seeking) {
      position = stream.position
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70)
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    try {
      if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
    } catch (e) {
      console.log("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message)
    }
    return bytesWritten
  },
  allocate: function(stream, offset, length) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if (offset < 0 || length <= 0) {
      throw new FS.ErrnoError(28)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8)
    }
    if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(43)
    }
    if (!stream.stream_ops.allocate) {
      throw new FS.ErrnoError(138)
    }
    stream.stream_ops.allocate(stream, offset, length)
  },
  mmap: function(stream, buffer, offset, length, position, prot, flags) {
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2)
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2)
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43)
    }
    return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
    if (!stream || !stream.stream_ops.msync) {
      return 0
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
  },
  munmap: function(stream) {
    return 0
  },
  ioctl: function(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59)
    }
    return stream.stream_ops.ioctl(stream, cmd, arg)
  },
  readFile: function(path, opts) {
    opts = opts || {};
    opts.flags = opts.flags || "r";
    opts.encoding = opts.encoding || "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      throw new Error('Invalid encoding type "' + opts.encoding + '"')
    }
    var ret;
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      ret = UTF8ArrayToString(buf, 0)
    } else if (opts.encoding === "binary") {
      ret = buf
    }
    FS.close(stream);
    return ret
  },
  writeFile: function(path, data, opts) {
    opts = opts || {};
    opts.flags = opts.flags || "w";
    var stream = FS.open(path, opts.flags, opts.mode);
    if (typeof data === "string") {
      var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
      var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
      FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
    } else if (ArrayBuffer.isView(data)) {
      FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
    } else {
      throw new Error("Unsupported data type")
    }
    FS.close(stream)
  },
  cwd: function() {
    return FS.currentPath
  },
  chdir: function(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44)
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54)
    }
    var err = FS.nodePermissions(lookup.node, "x");
    if (err) {
      throw new FS.ErrnoError(err)
    }
    FS.currentPath = lookup.path
  },
  createDefaultDirectories: function() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user")
  },
  createDefaultDevices: function() {
    FS.mkdir("/dev");
    FS.registerDevice(FS.makedev(1, 3), {
      read: function() {
        return 0
      },
      write: function(stream, buffer, offset, length, pos) {
        return length
      }
    });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    var random_device;
    if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
      var randomBuffer = new Uint8Array(1);
      random_device = function() {
        crypto.getRandomValues(randomBuffer);
        return randomBuffer[0]
      }
    } else if (ENVIRONMENT_IS_NODE) {
      try {
        var crypto_module = require("crypto");
        random_device = function() {
          return crypto_module["randomBytes"](1)[0]
        }
      } catch (e) {}
    } else {}
    if (!random_device) {
      random_device = function() {
        abort("random_device")
      }
    }
    FS.createDevice("/dev", "random", random_device);
    FS.createDevice("/dev", "urandom", random_device);
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp")
  },
  createSpecialDirectories: function() {
    FS.mkdir("/proc");
    FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({
      mount: function() {
        var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
        node.node_ops = {
          lookup: function(parent, name) {
            var fd = +name;
            var stream = FS.getStream(fd);
            if (!stream) throw new FS.ErrnoError(8);
            var ret = {
              parent: null,
              mount: {
                mountpoint: "fake"
              },
              node_ops: {
                readlink: function() {
                  return stream.path
                }
              }
            };
            ret.parent = ret;
            return ret
          }
        };
        return node
      }
    }, {}, "/proc/self/fd")
  },
  createStandardStreams: function() {
    if (Module["stdin"]) {
      FS.createDevice("/dev", "stdin", Module["stdin"])
    } else {
      FS.symlink("/dev/tty", "/dev/stdin")
    }
    if (Module["stdout"]) {
      FS.createDevice("/dev", "stdout", null, Module["stdout"])
    } else {
      FS.symlink("/dev/tty", "/dev/stdout")
    }
    if (Module["stderr"]) {
      FS.createDevice("/dev", "stderr", null, Module["stderr"])
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr")
    }
    var stdin = FS.open("/dev/stdin", "r");
    var stdout = FS.open("/dev/stdout", "w");
    var stderr = FS.open("/dev/stderr", "w")
  },
  ensureErrnoError: function() {
    if (FS.ErrnoError) return;
    FS.ErrnoError = function ErrnoError(errno, node) {
      this.node = node;
      this.setErrno = function(errno) {
        this.errno = errno
      };
      this.setErrno(errno);
      this.message = "FS error"
    };
    FS.ErrnoError.prototype = new Error;
    FS.ErrnoError.prototype.constructor = FS.ErrnoError;
    [44].forEach(function(code) {
      FS.genericErrors[code] = new FS.ErrnoError(code);
      FS.genericErrors[code].stack = "<generic error, no stack>"
    })
  },
  staticInit: function() {
    FS.ensureErrnoError();
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = {
      MEMFS: MEMFS,
      IDBFS: IDBFS
    }
  },
  init: function(input, output, error) {
    FS.init.initialized = true;
    FS.ensureErrnoError();
    Module["stdin"] = input || Module["stdin"];
    Module["stdout"] = output || Module["stdout"];
    Module["stderr"] = error || Module["stderr"];
    FS.createStandardStreams()
  },
  quit: function() {
    FS.init.initialized = false;
    var fflush = Module["_fflush"];
    if (fflush) fflush(0);
    for (var i = 0; i < FS.streams.length; i++) {
      var stream = FS.streams[i];
      if (!stream) {
        continue
      }
      FS.close(stream)
    }
  },
  getMode: function(canRead, canWrite) {
    var mode = 0;
    if (canRead) mode |= 292 | 73;
    if (canWrite) mode |= 146;
    return mode
  },
  joinPath: function(parts, forceRelative) {
    var path = PATH.join.apply(null, parts);
    if (forceRelative && path[0] == "/") path = path.substr(1);
    return path
  },
  absolutePath: function(relative, base) {
    return PATH_FS.resolve(base, relative)
  },
  standardizePath: function(path) {
    return PATH.normalize(path)
  },
  findObject: function(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (ret.exists) {
      return ret.object
    } else {
      ___setErrNo(ret.error);
      return null
    }
  },
  analyzePath: function(path, dontResolveLastLink) {
    try {
      var lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      path = lookup.path
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null
    };
    try {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/"
    } catch (e) {
      ret.error = e.errno
    }
    return ret
  },
  createFolder: function(parent, name, canRead, canWrite) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    var mode = FS.getMode(canRead, canWrite);
    return FS.mkdir(path, mode)
  },
  createPath: function(parent, path, canRead, canWrite) {
    parent = typeof parent === "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current)
      } catch (e) {}
      parent = current
    }
    return current
  },
  createFile: function(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    var mode = FS.getMode(canRead, canWrite);
    return FS.create(path, mode)
  },
  createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
    var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
    var mode = FS.getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      if (typeof data === "string") {
        var arr = new Array(data.length);
        for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
        data = arr
      }
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, "w");
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode)
    }
    return node
  },
  createDevice: function(parent, name, input, output) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    var mode = FS.getMode(!!input, !!output);
    if (!FS.createDevice.major) FS.createDevice.major = 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    FS.registerDevice(dev, {
      open: function(stream) {
        stream.seekable = false
      },
      close: function(stream) {
        if (output && output.buffer && output.buffer.length) {
          output(10)
        }
      },
      read: function(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input()
          } catch (e) {
            throw new FS.ErrnoError(29)
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(6)
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now()
        }
        return bytesRead
      },
      write: function(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i])
          } catch (e) {
            throw new FS.ErrnoError(29)
          }
        }
        if (length) {
          stream.node.timestamp = Date.now()
        }
        return i
      }
    });
    return FS.mkdev(path, mode, dev)
  },
  createLink: function(parent, name, target, canRead, canWrite) {
    var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
    return FS.symlink(target, path)
  },
  forceLoadFile: function(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    var success = true;
    if (typeof XMLHttpRequest !== "undefined") {
      throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
    } else if (read_) {
      try {
        obj.contents = intArrayFromString(read_(obj.url), true);
        obj.usedBytes = obj.contents.length
      } catch (e) {
        success = false
      }
    } else {
      throw new Error("Cannot load without read() or XMLHttpRequest.")
    }
    if (!success) ___setErrNo(29);
    return success
  },
  createLazyFile: function(parent, name, url, canRead, canWrite) {
    function LazyUint8Array() {
      this.lengthKnown = false;
      this.chunks = []
    }
    LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
      if (idx > this.length - 1 || idx < 0) {
        return undefined
      }
      var chunkOffset = idx % this.chunkSize;
      var chunkNum = idx / this.chunkSize | 0;
      return this.getter(chunkNum)[chunkOffset]
    };
    LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
      this.getter = getter
    };
    LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
      var xhr = new XMLHttpRequest;
      xhr.open("HEAD", url, false);
      xhr.send(null);
      if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
      var datalength = Number(xhr.getResponseHeader("Content-length"));
      var header;
      var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
      var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
      var chunkSize = 1024 * 1024;
      if (!hasByteServing) chunkSize = datalength;
      var doXHR = function(from, to) {
        if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
        if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
        if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
        if (xhr.overrideMimeType) {
          xhr.overrideMimeType("text/plain; charset=x-user-defined")
        }
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        if (xhr.response !== undefined) {
          return new Uint8Array(xhr.response || [])
        } else {
          return intArrayFromString(xhr.responseText || "", true)
        }
      };
      var lazyArray = this;
      lazyArray.setDataGetter(function(chunkNum) {
        var start = chunkNum * chunkSize;
        var end = (chunkNum + 1) * chunkSize - 1;
        end = Math.min(end, datalength - 1);
        if (typeof lazyArray.chunks[chunkNum] === "undefined") {
          lazyArray.chunks[chunkNum] = doXHR(start, end)
        }
        if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
        return lazyArray.chunks[chunkNum]
      });
      if (usesGzip || !datalength) {
        chunkSize = datalength = 1;
        datalength = this.getter(0).length;
        chunkSize = datalength;
        console.log("LazyFiles on gzip forces download of the whole file when length is accessed")
      }
      this._length = datalength;
      this._chunkSize = chunkSize;
      this.lengthKnown = true
    };
    if (typeof XMLHttpRequest !== "undefined") {
      if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
      var lazyArray = new LazyUint8Array;
      Object.defineProperties(lazyArray, {
        length: {
          get: function() {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._length
          }
        },
        chunkSize: {
          get: function() {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._chunkSize
          }
        }
      });
      var properties = {
        isDevice: false,
        contents: lazyArray
      }
    } else {
      var properties = {
        isDevice: false,
        url: url
      }
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    if (properties.contents) {
      node.contents = properties.contents
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url
    }
    Object.defineProperties(node, {
      usedBytes: {
        get: function() {
          return this.contents.length
        }
      }
    });
    var stream_ops = {};
    var keys = Object.keys(node.stream_ops);
    keys.forEach(function(key) {
      var fn = node.stream_ops[key];
      stream_ops[key] = function forceLoadLazyFile() {
        if (!FS.forceLoadFile(node)) {
          throw new FS.ErrnoError(29)
        }
        return fn.apply(null, arguments)
      }
    });
    stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
      if (!FS.forceLoadFile(node)) {
        throw new FS.ErrnoError(29)
      }
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      if (contents.slice) {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i]
        }
      } else {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents.get(position + i)
        }
      }
      return size
    };
    node.stream_ops = stream_ops;
    return node
  },
  createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
    Browser.init();
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency("cp " + fullname);

    function processData(byteArray) {
      function finish(byteArray) {
        if (preFinish) preFinish();
        if (!dontCreateFile) {
          FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
        }
        if (onload) onload();
        removeRunDependency(dep)
      }
      var handled = false;
      Module["preloadPlugins"].forEach(function(plugin) {
        if (handled) return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, function() {
            if (onerror) onerror();
            removeRunDependency(dep)
          });
          handled = true
        }
      });
      if (!handled) finish(byteArray)
    }
    addRunDependency(dep);
    if (typeof url == "string") {
      Browser.asyncLoad(url, function(byteArray) {
        processData(byteArray)
      }, onerror)
    } else {
      processData(url)
    }
  },
  indexedDB: function() {
    if (indexedDB) { return indexedDB; } // XXX
    return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
  },
  DB_NAME: function() {
    if (self) { return "EM_FS_" + self.location.pathname; } // XXX
    return "EM_FS_" + window.location.pathname
  },
  DB_VERSION: 1, // XXX was 20
  DB_STORE_NAME: "FILE_DATA",
  saveFilesToDB: function(paths, onload, onerror) {
    onload = onload || function() {};
    onerror = onerror || function() {};
    var indexedDB = FS.indexedDB();
    try {
      var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
    } catch (e) {
      return onerror(e)
    }
    openRequest.onupgradeneeded = function openRequest_onupgradeneeded(event) {
      event.target.result.createObjectStore(FS.DB_STORE_NAME); // XXX
    };
    openRequest.onsuccess = function openRequest_onsuccess() {
      var db = openRequest.result;
      var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
      var files = transaction.objectStore(FS.DB_STORE_NAME);
      var ok = 0,
        fail = 0,
        total = paths.length;

      function finish() {
        if (fail == 0) onload();
        else onerror()
      }
      paths.forEach(function(path) {
        var putRequest = files.put(FS.analyzePath(path).object.contents, path);
        putRequest.onsuccess = function putRequest_onsuccess() {
          ok++;
          if (ok + fail == total) finish()
        };
        putRequest.onerror = function putRequest_onerror() {
          fail++;
          if (ok + fail == total) finish()
        }
      });
      transaction.onerror = onerror
    };
    openRequest.onerror = onerror
  },
  loadFilesFromDB: function(paths, onload, onerror) {
    onload = onload || function() {};
    onerror = onerror || function() {};
    var indexedDB = FS.indexedDB();
    try {
      var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
    } catch (e) {
      return onerror(e)
    }
    openRequest.onupgradeneeded = onerror;
    openRequest.onblocked = function(arguments) {
      console.error('loadFilesFromDB blocked', arguments); // XXX
    }
    openRequest.onsuccess = function openRequest_onsuccess() {
      var db = openRequest.result;
      try {
        var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
      } catch (e) {
        onerror(e);
        return
      }
      var files = transaction.objectStore(FS.DB_STORE_NAME);
      var ok = 0,
        fail = 0,
        total = paths.length;

      function finish() {
        // XXX
        // Cleanup IndexedDB connection so that mainthread can use IDB again.
        transaction.commit();
        db.close();
        if (fail == 0) onload();
        else onerror()
      }
      paths.forEach(function(path) {
        var getRequest = files.get(path);
        getRequest.onsuccess = function getRequest_onsuccess() {
          if (FS.analyzePath(path).exists) {
            FS.unlink(path)
          }
          FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
          ok++;

          if (ok + fail == total) finish()
        };
        getRequest.onerror = function getRequest_onerror() {
          fail++;
          if (ok + fail == total) finish()
        }
      });
      transaction.onerror = onerror
    };
    openRequest.onerror = onerror
  }
};
var SYSCALLS = {
  DEFAULT_POLLMASK: 5,
  mappings: {},
  umask: 511,
  calculateAt: function(dirfd, path) {
    if (path[0] !== "/") {
      var dir;
      if (dirfd === -100) {
        dir = FS.cwd()
      } else {
        var dirstream = FS.getStream(dirfd);
        if (!dirstream) throw new FS.ErrnoError(8);
        dir = dirstream.path
      }
      path = PATH.join2(dir, path)
    }
    return path
  },
  doStat: function(func, path, buf) {
    try {
      var stat = func(path)
    } catch (e) {
      if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
        return -54
      }
      throw e
    }
    HEAP32[buf >> 2] = stat.dev;
    HEAP32[buf + 4 >> 2] = 0;
    HEAP32[buf + 8 >> 2] = stat.ino;
    HEAP32[buf + 12 >> 2] = stat.mode;
    HEAP32[buf + 16 >> 2] = stat.nlink;
    HEAP32[buf + 20 >> 2] = stat.uid;
    HEAP32[buf + 24 >> 2] = stat.gid;
    HEAP32[buf + 28 >> 2] = stat.rdev;
    HEAP32[buf + 32 >> 2] = 0;
    tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
    HEAP32[buf + 48 >> 2] = 4096;
    HEAP32[buf + 52 >> 2] = stat.blocks;
    HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
    HEAP32[buf + 60 >> 2] = 0;
    HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
    HEAP32[buf + 68 >> 2] = 0;
    HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
    HEAP32[buf + 76 >> 2] = 0;
    tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 80 >> 2] = tempI64[0], HEAP32[buf + 84 >> 2] = tempI64[1];
    return 0
  },
  doMsync: function(addr, stream, len, flags) {
    var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
    FS.msync(stream, buffer, 0, len, flags)
  },
  doMkdir: function(path, mode) {
    path = PATH.normalize(path);
    if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
    FS.mkdir(path, mode, 0);
    return 0
  },
  doMknod: function(path, mode, dev) {
    switch (mode & 61440) {
      case 32768:
      case 8192:
      case 24576:
      case 4096:
      case 49152:
        break;
      default:
        return -28
    }
    FS.mknod(path, mode, dev);
    return 0
  },
  doReadlink: function(path, buf, bufsize) {
    if (bufsize <= 0) return -28;
    var ret = FS.readlink(path);
    var len = Math.min(bufsize, lengthBytesUTF8(ret));
    var endChar = HEAP8[buf + len];
    stringToUTF8(ret, buf, bufsize + 1);
    HEAP8[buf + len] = endChar;
    return len
  },
  doAccess: function(path, amode) {
    if (amode & ~7) {
      return -28
    }
    var node;
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    node = lookup.node;
    if (!node) {
      return -44
    }
    var perms = "";
    if (amode & 4) perms += "r";
    if (amode & 2) perms += "w";
    if (amode & 1) perms += "x";
    if (perms && FS.nodePermissions(node, perms)) {
      return -2
    }
    return 0
  },
  doDup: function(path, flags, suggestFD) {
    var suggest = FS.getStream(suggestFD);
    if (suggest) FS.close(suggest);
    return FS.open(path, flags, 0, suggestFD, suggestFD).fd
  },
  doReadv: function(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[iov + i * 8 >> 2];
      var len = HEAP32[iov + (i * 8 + 4) >> 2];
      var curr = FS.read(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break
    }
    return ret
  },
  doWritev: function(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[iov + i * 8 >> 2];
      var len = HEAP32[iov + (i * 8 + 4) >> 2];
      var curr = FS.write(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr
    }
    return ret
  },
  varargs: 0,
  get: function(varargs) {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
    return ret
  },
  getStr: function() {
    var ret = UTF8ToString(SYSCALLS.get());
    return ret
  },
  getStreamFromFD: function(fd) {
    if (fd === undefined) fd = SYSCALLS.get();
    var stream = FS.getStream(fd);
    if (!stream) throw new FS.ErrnoError(8);
    return stream
  },
  get64: function() {
    var low = SYSCALLS.get(),
      high = SYSCALLS.get();
    return low
  },
  getZero: function() {
    SYSCALLS.get()
  }
};

function ___syscall10(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr();
    FS.unlink(path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall12(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr();
    FS.chdir(path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall122(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var buf = SYSCALLS.get();
    if (!buf) return -21;
    var layout = {
      sysname: 0,
      nodename: 65,
      domainname: 325,
      machine: 260,
      version: 195,
      release: 130,
      __size__: 390
    };
    var copyString = function(element, value) {
      var offset = layout[element];
      writeAsciiToMemory(value, buf + offset)
    };
    copyString("sysname", "Emscripten");
    copyString("nodename", "emscripten");
    copyString("release", "1.0");
    copyString("version", "#1");
    copyString("machine", "x86-JS");
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall133(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD();
    FS.chdir(stream.path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall15(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      mode = SYSCALLS.get();
    FS.chmod(path, mode);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall168(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fds = SYSCALLS.get(),
      nfds = SYSCALLS.get(),
      timeout = SYSCALLS.get();
    var nonzero = 0;
    for (var i = 0; i < nfds; i++) {
      var pollfd = fds + 8 * i;
      var fd = HEAP32[pollfd >> 2];
      var events = HEAP16[pollfd + 4 >> 1];
      var mask = 32;
      var stream = FS.getStream(fd);
      if (stream) {
        mask = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops.poll) {
          mask = stream.stream_ops.poll(stream)
        }
      }
      mask &= events | 8 | 16;
      if (mask) nonzero++;
      HEAP16[pollfd + 6 >> 1] = mask
    }
    return nonzero
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall183(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var buf = SYSCALLS.get(),
      size = SYSCALLS.get();
    if (size === 0) return -28;
    var cwd = FS.cwd();
    var cwdLengthInBytes = lengthBytesUTF8(cwd);
    if (size < cwdLengthInBytes + 1) return -68;
    stringToUTF8(cwd, buf, size);
    return buf
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall191(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var resource = SYSCALLS.get(),
      rlim = SYSCALLS.get();
    HEAP32[rlim >> 2] = -1;
    HEAP32[rlim + 4 >> 2] = -1;
    HEAP32[rlim + 8 >> 2] = -1;
    HEAP32[rlim + 12 >> 2] = -1;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall194(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fd = SYSCALLS.get(),
      zero = SYSCALLS.getZero(),
      length = SYSCALLS.get64();
    FS.ftruncate(fd, length);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall195(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.stat, path, buf)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall196(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.lstat, path, buf)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall197(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(),
      buf = SYSCALLS.get();
    return SYSCALLS.doStat(FS.stat, stream.path, buf)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall202(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall199(a0, a1) {
  return ___syscall202(a0, a1)
}
var PROCINFO = {
  ppid: 1,
  pid: 42,
  sid: 42,
  pgid: 42
};

function ___syscall20(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return PROCINFO.pid
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall200(a0, a1) {
  return ___syscall202(a0, a1)
}

function ___syscall207(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fd = SYSCALLS.get(),
      owner = SYSCALLS.get(),
      group = SYSCALLS.get();
    FS.fchown(fd, owner, group);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall212(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      owner = SYSCALLS.get(),
      group = SYSCALLS.get();
    FS.chown(path, owner, group);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall220(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(),
      dirp = SYSCALLS.get(),
      count = SYSCALLS.get();
    if (!stream.getdents) {
      stream.getdents = FS.readdir(stream.path)
    }
    var struct_size = 280;
    var pos = 0;
    var off = FS.llseek(stream, 0, 1);
    var idx = Math.floor(off / struct_size);
    while (idx < stream.getdents.length && pos + struct_size <= count) {
      var id;
      var type;
      var name = stream.getdents[idx];
      if (name[0] === ".") {
        id = 1;
        type = 4
      } else {
        var child = FS.lookupNode(stream.node, name);
        id = child.id;
        type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8
      }
      tempI64 = [id >>> 0, (tempDouble = id, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos >> 2] = tempI64[0], HEAP32[dirp + pos + 4 >> 2] = tempI64[1];
      tempI64 = [(idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos + 8 >> 2] = tempI64[0], HEAP32[dirp + pos + 12 >> 2] = tempI64[1];
      HEAP16[dirp + pos + 16 >> 1] = 280;
      HEAP8[dirp + pos + 18 >> 0] = type;
      stringToUTF8(name, dirp + pos + 19, 256);
      pos += struct_size;
      idx += 1
    }
    FS.llseek(stream, idx * struct_size, 0);
    return pos
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall221(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(),
      cmd = SYSCALLS.get();
    switch (cmd) {
      case 0: {
        var arg = SYSCALLS.get();
        if (arg < 0) {
          return -28
        }
        var newStream;
        newStream = FS.open(stream.path, stream.flags, 0, arg);
        return newStream.fd
      }
      case 1:
      case 2:
        return 0;
      case 3:
        return stream.flags;
      case 4: {
        var arg = SYSCALLS.get();
        stream.flags |= arg;
        return 0
      }
      case 12: {
        var arg = SYSCALLS.get();
        var offset = 0;
        HEAP16[arg + offset >> 1] = 2;
        return 0
      }
      case 13:
      case 14:
        return 0;
      case 16:
      case 8:
        return -28;
      case 9:
        ___setErrNo(28);
        return -1;
      default: {
        return -28
      }
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall3(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(),
      buf = SYSCALLS.get(),
      count = SYSCALLS.get();
    return FS.read(stream, HEAP8, buf, count)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall33(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      amode = SYSCALLS.get();
    return SYSCALLS.doAccess(path, amode)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall340(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var pid = SYSCALLS.get(),
      resource = SYSCALLS.get(),
      new_limit = SYSCALLS.get(),
      old_limit = SYSCALLS.get();
    if (old_limit) {
      HEAP32[old_limit >> 2] = -1;
      HEAP32[old_limit + 4 >> 2] = -1;
      HEAP32[old_limit + 8 >> 2] = -1;
      HEAP32[old_limit + 12 >> 2] = -1
    }
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall36(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall38(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var old_path = SYSCALLS.getStr(),
      new_path = SYSCALLS.getStr();
    FS.rename(old_path, new_path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall39(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      mode = SYSCALLS.get();
    return SYSCALLS.doMkdir(path, mode)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall4(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(),
      buf = SYSCALLS.get(),
      count = SYSCALLS.get();
    return FS.write(stream, HEAP8, buf, count)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall40(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr();
    FS.rmdir(path);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall41(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var old = SYSCALLS.getStreamFromFD();
    return FS.open(old.path, old.flags, 0).fd
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall5(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var pathname = SYSCALLS.getStr(),
      flags = SYSCALLS.get(),
      mode = SYSCALLS.get();
    var stream = FS.open(pathname, flags, mode);
    return stream.fd
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall54(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(),
      op = SYSCALLS.get();
    switch (op) {
      case 21509:
      case 21505: {
        if (!stream.tty) return -59;
        return 0
      }
      case 21510:
      case 21511:
      case 21512:
      case 21506:
      case 21507:
      case 21508: {
        if (!stream.tty) return -59;
        return 0
      }
      case 21519: {
        if (!stream.tty) return -59;
        var argp = SYSCALLS.get();
        HEAP32[argp >> 2] = 0;
        return 0
      }
      case 21520: {
        if (!stream.tty) return -59;
        return -28
      }
      case 21531: {
        var argp = SYSCALLS.get();
        return FS.ioctl(stream, op, argp)
      }
      case 21523: {
        if (!stream.tty) return -59;
        return 0
      }
      case 21524: {
        if (!stream.tty) return -59;
        return 0
      }
      default:
        abort("bad ioctl syscall " + op)
    }
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall60(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var mask = SYSCALLS.get();
    var old = SYSCALLS.umask;
    SYSCALLS.umask = mask;
    return old
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall85(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var path = SYSCALLS.getStr(),
      buf = SYSCALLS.get(),
      bufsize = SYSCALLS.get();
    return SYSCALLS.doReadlink(path, buf, bufsize)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function __emscripten_syscall_munmap(addr, len) {
  if (addr === -1 || len === 0) {
    return -28
  }
  var info = SYSCALLS.mappings[addr];
  if (!info) return 0;
  if (len === info.len) {
    var stream = FS.getStream(info.fd);
    SYSCALLS.doMsync(addr, stream, len, info.flags);
    FS.munmap(stream);
    SYSCALLS.mappings[addr] = null;
    if (info.allocated) {
      _free(info.malloc)
    }
  }
  return 0
}

function ___syscall91(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var addr = SYSCALLS.get(),
      len = SYSCALLS.get();
    return __emscripten_syscall_munmap(addr, len)
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___syscall94(which, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var fd = SYSCALLS.get(),
      mode = SYSCALLS.get();
    FS.fchmod(fd, mode);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno
  }
}

function ___unlock() {}

function _exit(status) {
  exit(status)
}

function __exit(a0) {
  return _exit(a0)
}

function _dlopen() {
  abort("To use dlopen, you need to use Emscripten's linking support, see https://github.com/emscripten-core/emscripten/wiki/Linking")
}

function _dlclose() {
  return _dlopen.apply(null, arguments)
}

function _dlerror() {
  return _dlopen.apply(null, arguments)
}

function _dlsym() {
  return _dlopen.apply(null, arguments)
}

function _emscripten_get_heap_size() {
  return HEAP8.length
}

function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.set(HEAPU8.subarray(src, src + num), dest)
}

function emscripten_realloc_buffer(size) {
  try {
    wasmMemory.grow(size - buffer.byteLength + 65535 >> 16);
    updateGlobalBufferAndViews(wasmMemory.buffer);
    return 1
  } catch (e) {}
}

function _emscripten_resize_heap(requestedSize) {
  var oldSize = _emscripten_get_heap_size();
  var PAGE_MULTIPLE = 65536;
  var LIMIT = 2147483648 - PAGE_MULTIPLE;
  if (requestedSize > LIMIT) {
    return false
  }
  var MIN_TOTAL_MEMORY = 16777216;
  var newSize = Math.max(oldSize, MIN_TOTAL_MEMORY);
  while (newSize < requestedSize) {
    if (newSize <= 536870912) {
      newSize = alignUp(2 * newSize, PAGE_MULTIPLE)
    } else {
      newSize = Math.min(alignUp((3 * newSize + 2147483648) / 4, PAGE_MULTIPLE), LIMIT)
    }
  }
  var replacement = emscripten_realloc_buffer(newSize);
  if (!replacement) {
    return false
  }
  return true
}

function _endpwent() {
  throw "endpwent: TODO"
}
var ENV = {};

function _emscripten_get_environ() {
  if (!_emscripten_get_environ.strings) {
    var env = {
      USER: "web_user",
      LOGNAME: "web_user",
      PATH: "/",
      PWD: "/",
      HOME: "/home/web_user",
      LANG: (typeof navigator === "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8",
      _: thisProgram
    };
    for (var x in ENV) {
      env[x] = ENV[x]
    }
    var strings = [];
    for (var x in env) {
      strings.push(x + "=" + env[x])
    }
    _emscripten_get_environ.strings = strings
  }
  return _emscripten_get_environ.strings
}

function _environ_get(__environ, environ_buf) {
  var strings = _emscripten_get_environ();
  var bufSize = 0;
  strings.forEach(function(string, i) {
    var ptr = environ_buf + bufSize;
    HEAP32[__environ + i * 4 >> 2] = ptr;
    writeAsciiToMemory(string, ptr);
    bufSize += string.length + 1
  });
  return 0
}

function _environ_sizes_get(penviron_count, penviron_buf_size) {
  var strings = _emscripten_get_environ();
  HEAP32[penviron_count >> 2] = strings.length;
  var bufSize = 0;
  strings.forEach(function(string) {
    bufSize += string.length + 1
  });
  HEAP32[penviron_buf_size >> 2] = bufSize;
  return 0
}

function _fd_close(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.close(stream);
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno
  }
}

function _fd_fdstat_get(fd, pbuf) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
    HEAP8[pbuf >> 0] = type;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno
  }
}

function _fd_read(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = SYSCALLS.doReadv(stream, iov, iovcnt);
    HEAP32[pnum >> 2] = num;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno
  }
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var HIGH_OFFSET = 4294967296;
    var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
    var DOUBLE_LIMIT = 9007199254740992;
    if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
      return -61
    }
    FS.llseek(stream, offset, whence);
    tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
    if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno
  }
}

function _fd_sync(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    if (stream.stream_ops && stream.stream_ops.fsync) {
      return -stream.stream_ops.fsync(stream)
    }
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno
  }
}

function _fd_write(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = SYSCALLS.doWritev(stream, iov, iovcnt);
    HEAP32[pnum >> 2] = num;
    return 0
  } catch (e) {
    if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
    return e.errno
  }
}

function _getpwent() {
  throw "getpwent: TODO"
}

function _getpwnam() {
  throw "getpwnam: TODO"
}

function _getpwuid(uid) {
  return 0
}

function _gettimeofday(ptr) {
  var now = Date.now();
  HEAP32[ptr >> 2] = now / 1e3 | 0;
  HEAP32[ptr + 4 >> 2] = now % 1e3 * 1e3 | 0;
  return 0
}
var ERRNO_CODES = {
  EPERM: 63,
  ENOENT: 44,
  ESRCH: 71,
  EINTR: 27,
  EIO: 29,
  ENXIO: 60,
  E2BIG: 1,
  ENOEXEC: 45,
  EBADF: 8,
  ECHILD: 12,
  EAGAIN: 6,
  EWOULDBLOCK: 6,
  ENOMEM: 48,
  EACCES: 2,
  EFAULT: 21,
  ENOTBLK: 105,
  EBUSY: 10,
  EEXIST: 20,
  EXDEV: 75,
  ENODEV: 43,
  ENOTDIR: 54,
  EISDIR: 31,
  EINVAL: 28,
  ENFILE: 41,
  EMFILE: 33,
  ENOTTY: 59,
  ETXTBSY: 74,
  EFBIG: 22,
  ENOSPC: 51,
  ESPIPE: 70,
  EROFS: 69,
  EMLINK: 34,
  EPIPE: 64,
  EDOM: 18,
  ERANGE: 68,
  ENOMSG: 49,
  EIDRM: 24,
  ECHRNG: 106,
  EL2NSYNC: 156,
  EL3HLT: 107,
  EL3RST: 108,
  ELNRNG: 109,
  EUNATCH: 110,
  ENOCSI: 111,
  EL2HLT: 112,
  EDEADLK: 16,
  ENOLCK: 46,
  EBADE: 113,
  EBADR: 114,
  EXFULL: 115,
  ENOANO: 104,
  EBADRQC: 103,
  EBADSLT: 102,
  EDEADLOCK: 16,
  EBFONT: 101,
  ENOSTR: 100,
  ENODATA: 116,
  ETIME: 117,
  ENOSR: 118,
  ENONET: 119,
  ENOPKG: 120,
  EREMOTE: 121,
  ENOLINK: 47,
  EADV: 122,
  ESRMNT: 123,
  ECOMM: 124,
  EPROTO: 65,
  EMULTIHOP: 36,
  EDOTDOT: 125,
  EBADMSG: 9,
  ENOTUNIQ: 126,
  EBADFD: 127,
  EREMCHG: 128,
  ELIBACC: 129,
  ELIBBAD: 130,
  ELIBSCN: 131,
  ELIBMAX: 132,
  ELIBEXEC: 133,
  ENOSYS: 52,
  ENOTEMPTY: 55,
  ENAMETOOLONG: 37,
  ELOOP: 32,
  EOPNOTSUPP: 138,
  EPFNOSUPPORT: 139,
  ECONNRESET: 15,
  ENOBUFS: 42,
  EAFNOSUPPORT: 5,
  EPROTOTYPE: 67,
  ENOTSOCK: 57,
  ENOPROTOOPT: 50,
  ESHUTDOWN: 140,
  ECONNREFUSED: 14,
  EADDRINUSE: 3,
  ECONNABORTED: 13,
  ENETUNREACH: 40,
  ENETDOWN: 38,
  ETIMEDOUT: 73,
  EHOSTDOWN: 142,
  EHOSTUNREACH: 23,
  EINPROGRESS: 26,
  EALREADY: 7,
  EDESTADDRREQ: 17,
  EMSGSIZE: 35,
  EPROTONOSUPPORT: 66,
  ESOCKTNOSUPPORT: 137,
  EADDRNOTAVAIL: 4,
  ENETRESET: 39,
  EISCONN: 30,
  ENOTCONN: 53,
  ETOOMANYREFS: 141,
  EUSERS: 136,
  EDQUOT: 19,
  ESTALE: 72,
  ENOTSUP: 138,
  ENOMEDIUM: 148,
  EILSEQ: 25,
  EOVERFLOW: 61,
  ECANCELED: 11,
  ENOTRECOVERABLE: 56,
  EOWNERDEAD: 62,
  ESTRPIPE: 135
};

function _kill(pid, sig) {
  ___setErrNo(ERRNO_CODES.EPERM);
  return -1
}
var ___tm_timezone = (stringToUTF8("GMT", 247888, 4), 247888);

function _tzset() {
  if (_tzset.called) return;
  _tzset.called = true;
  HEAP32[__get_timezone() >> 2] = (new Date).getTimezoneOffset() * 60;
  var currentYear = (new Date).getFullYear();
  var winter = new Date(currentYear, 0, 1);
  var summer = new Date(currentYear, 6, 1);
  HEAP32[__get_daylight() >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());

  function extractZone(date) {
    var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
    return match ? match[1] : "GMT"
  }
  var winterName = extractZone(winter);
  var summerName = extractZone(summer);
  var winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL);
  var summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
  if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
    HEAP32[__get_tzname() >> 2] = winterNamePtr;
    HEAP32[__get_tzname() + 4 >> 2] = summerNamePtr
  } else {
    HEAP32[__get_tzname() >> 2] = summerNamePtr;
    HEAP32[__get_tzname() + 4 >> 2] = winterNamePtr
  }
}

function _localtime_r(time, tmPtr) {
  _tzset();
  var date = new Date(HEAP32[time >> 2] * 1e3);
  HEAP32[tmPtr >> 2] = date.getSeconds();
  HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
  HEAP32[tmPtr + 8 >> 2] = date.getHours();
  HEAP32[tmPtr + 12 >> 2] = date.getDate();
  HEAP32[tmPtr + 16 >> 2] = date.getMonth();
  HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
  HEAP32[tmPtr + 24 >> 2] = date.getDay();
  var start = new Date(date.getFullYear(), 0, 1);
  var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
  HEAP32[tmPtr + 28 >> 2] = yday;
  HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  HEAP32[tmPtr + 32 >> 2] = dst;
  var zonePtr = HEAP32[__get_tzname() + (dst ? 4 : 0) >> 2];
  HEAP32[tmPtr + 40 >> 2] = zonePtr;
  return tmPtr
}

function _mktime(tmPtr) {
  _tzset();
  var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
  var dst = HEAP32[tmPtr + 32 >> 2];
  var guessedOffset = date.getTimezoneOffset();
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dstOffset = Math.min(winterOffset, summerOffset);
  if (dst < 0) {
    HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset)
  } else if (dst > 0 != (dstOffset == guessedOffset)) {
    var nonDstOffset = Math.max(winterOffset, summerOffset);
    var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
    date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4)
  }
  HEAP32[tmPtr + 24 >> 2] = date.getDay();
  var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
  HEAP32[tmPtr + 28 >> 2] = yday;
  return date.getTime() / 1e3 | 0
}

function _usleep(useconds) {
  var msec = useconds / 1e3;
  if ((ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && self["performance"] && self["performance"]["now"]) {
    var start = self["performance"]["now"]();
    while (self["performance"]["now"]() - start < msec) {}
  } else {
    var start = Date.now();
    while (Date.now() - start < msec) {}
  }
  return 0
}

function _nanosleep(rqtp, rmtp) {
  if (rqtp === 0) {
    ___setErrNo(28);
    return -1
  }
  var seconds = HEAP32[rqtp >> 2];
  var nanoseconds = HEAP32[rqtp + 4 >> 2];
  if (nanoseconds < 0 || nanoseconds > 999999999 || seconds < 0) {
    ___setErrNo(28);
    return -1
  }
  if (rmtp !== 0) {
    HEAP32[rmtp >> 2] = 0;
    HEAP32[rmtp + 4 >> 2] = 0
  }
  return _usleep(seconds * 1e6 + nanoseconds / 1e3)
}

function _setpwent() {
  throw "setpwent: TODO"
}
var __sigalrm_handler = 0;

function _signal(sig, func) {
  if (sig == 14) {
    __sigalrm_handler = func
  } else {}
  return 0
}

function __isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function __arraySum(array, index) {
  var sum = 0;
  for (var i = 0; i <= index; sum += array[i++]);
  return sum
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function __addDays(date, days) {
  var newDate = new Date(date.getTime());
  while (days > 0) {
    var leap = __isLeapYear(newDate.getFullYear());
    var currentMonth = newDate.getMonth();
    var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
    if (days > daysInCurrentMonth - newDate.getDate()) {
      days -= daysInCurrentMonth - newDate.getDate() + 1;
      newDate.setDate(1);
      if (currentMonth < 11) {
        newDate.setMonth(currentMonth + 1)
      } else {
        newDate.setMonth(0);
        newDate.setFullYear(newDate.getFullYear() + 1)
      }
    } else {
      newDate.setDate(newDate.getDate() + days);
      return newDate
    }
  }
  return newDate
}

function _strftime(s, maxsize, format, tm) {
  var tm_zone = HEAP32[tm + 40 >> 2];
  var date = {
    tm_sec: HEAP32[tm >> 2],
    tm_min: HEAP32[tm + 4 >> 2],
    tm_hour: HEAP32[tm + 8 >> 2],
    tm_mday: HEAP32[tm + 12 >> 2],
    tm_mon: HEAP32[tm + 16 >> 2],
    tm_year: HEAP32[tm + 20 >> 2],
    tm_wday: HEAP32[tm + 24 >> 2],
    tm_yday: HEAP32[tm + 28 >> 2],
    tm_isdst: HEAP32[tm + 32 >> 2],
    tm_gmtoff: HEAP32[tm + 36 >> 2],
    tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
  };
  var pattern = UTF8ToString(format);
  var EXPANSION_RULES_1 = {
    "%c": "%a %b %d %H:%M:%S %Y",
    "%D": "%m/%d/%y",
    "%F": "%Y-%m-%d",
    "%h": "%b",
    "%r": "%I:%M:%S %p",
    "%R": "%H:%M",
    "%T": "%H:%M:%S",
    "%x": "%m/%d/%y",
    "%X": "%H:%M:%S",
    "%Ec": "%c",
    "%EC": "%C",
    "%Ex": "%m/%d/%y",
    "%EX": "%H:%M:%S",
    "%Ey": "%y",
    "%EY": "%Y",
    "%Od": "%d",
    "%Oe": "%e",
    "%OH": "%H",
    "%OI": "%I",
    "%Om": "%m",
    "%OM": "%M",
    "%OS": "%S",
    "%Ou": "%u",
    "%OU": "%U",
    "%OV": "%V",
    "%Ow": "%w",
    "%OW": "%W",
    "%Oy": "%y"
  };
  for (var rule in EXPANSION_RULES_1) {
    pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule])
  }
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function leadingSomething(value, digits, character) {
    var str = typeof value === "number" ? value.toString() : value || "";
    while (str.length < digits) {
      str = character[0] + str
    }
    return str
  }

  function leadingNulls(value, digits) {
    return leadingSomething(value, digits, "0")
  }

  function compareByDay(date1, date2) {
    function sgn(value) {
      return value < 0 ? -1 : value > 0 ? 1 : 0
    }
    var compare;
    if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
      if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
        compare = sgn(date1.getDate() - date2.getDate())
      }
    }
    return compare
  }

  function getFirstWeekStartDate(janFourth) {
    switch (janFourth.getDay()) {
      case 0:
        return new Date(janFourth.getFullYear() - 1, 11, 29);
      case 1:
        return janFourth;
      case 2:
        return new Date(janFourth.getFullYear(), 0, 3);
      case 3:
        return new Date(janFourth.getFullYear(), 0, 2);
      case 4:
        return new Date(janFourth.getFullYear(), 0, 1);
      case 5:
        return new Date(janFourth.getFullYear() - 1, 11, 31);
      case 6:
        return new Date(janFourth.getFullYear() - 1, 11, 30)
    }
  }

  function getWeekBasedYear(date) {
    var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
    var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
    var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
    var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
    var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
    if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
      if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
        return thisDate.getFullYear() + 1
      } else {
        return thisDate.getFullYear()
      }
    } else {
      return thisDate.getFullYear() - 1
    }
  }
  var EXPANSION_RULES_2 = {
    "%a": function(date) {
      return WEEKDAYS[date.tm_wday].substring(0, 3)
    },
    "%A": function(date) {
      return WEEKDAYS[date.tm_wday]
    },
    "%b": function(date) {
      return MONTHS[date.tm_mon].substring(0, 3)
    },
    "%B": function(date) {
      return MONTHS[date.tm_mon]
    },
    "%C": function(date) {
      var year = date.tm_year + 1900;
      return leadingNulls(year / 100 | 0, 2)
    },
    "%d": function(date) {
      return leadingNulls(date.tm_mday, 2)
    },
    "%e": function(date) {
      return leadingSomething(date.tm_mday, 2, " ")
    },
    "%g": function(date) {
      return getWeekBasedYear(date).toString().substring(2)
    },
    "%G": function(date) {
      return getWeekBasedYear(date)
    },
    "%H": function(date) {
      return leadingNulls(date.tm_hour, 2)
    },
    "%I": function(date) {
      var twelveHour = date.tm_hour;
      if (twelveHour == 0) twelveHour = 12;
      else if (twelveHour > 12) twelveHour -= 12;
      return leadingNulls(twelveHour, 2)
    },
    "%j": function(date) {
      return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
    },
    "%m": function(date) {
      return leadingNulls(date.tm_mon + 1, 2)
    },
    "%M": function(date) {
      return leadingNulls(date.tm_min, 2)
    },
    "%n": function() {
      return "\n"
    },
    "%p": function(date) {
      if (date.tm_hour >= 0 && date.tm_hour < 12) {
        return "AM"
      } else {
        return "PM"
      }
    },
    "%S": function(date) {
      return leadingNulls(date.tm_sec, 2)
    },
    "%t": function() {
      return "\t"
    },
    "%u": function(date) {
      return date.tm_wday || 7
    },
    "%U": function(date) {
      var janFirst = new Date(date.tm_year + 1900, 0, 1);
      var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
      var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
      if (compareByDay(firstSunday, endDate) < 0) {
        var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
        var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2)
      }
      return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
    },
    "%V": function(date) {
      var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
      var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
      var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
      var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
      var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
      if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
        return "53"
      }
      if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
        return "01"
      }
      var daysDifference;
      if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
        daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()
      } else {
        daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
      }
      return leadingNulls(Math.ceil(daysDifference / 7), 2)
    },
    "%w": function(date) {
      return date.tm_wday
    },
    "%W": function(date) {
      var janFirst = new Date(date.tm_year, 0, 1);
      var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
      var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
      if (compareByDay(firstMonday, endDate) < 0) {
        var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
        var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
        var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
        return leadingNulls(Math.ceil(days / 7), 2)
      }
      return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
    },
    "%y": function(date) {
      return (date.tm_year + 1900).toString().substring(2)
    },
    "%Y": function(date) {
      return date.tm_year + 1900
    },
    "%z": function(date) {
      var off = date.tm_gmtoff;
      var ahead = off >= 0;
      off = Math.abs(off) / 60;
      off = off / 60 * 100 + off % 60;
      return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
    },
    "%Z": function(date) {
      return date.tm_zone
    },
    "%%": function() {
      return "%"
    }
  };
  for (var rule in EXPANSION_RULES_2) {
    if (pattern.indexOf(rule) >= 0) {
      pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date))
    }
  }
  var bytes = intArrayFromString(pattern, false);
  if (bytes.length > maxsize) {
    return 0
  }
  writeArrayToMemory(bytes, s);
  return bytes.length - 1
}

function _strptime(buf, format, tm) {
  var pattern = UTF8ToString(format);
  var SPECIAL_CHARS = "\\!@#$^&*()+=-[]/{}|:<>?,.";
  for (var i = 0, ii = SPECIAL_CHARS.length; i < ii; ++i) {
    pattern = pattern.replace(new RegExp("\\" + SPECIAL_CHARS[i], "g"), "\\" + SPECIAL_CHARS[i])
  }
  var EQUIVALENT_MATCHERS = {
    "%A": "%a",
    "%B": "%b",
    "%c": "%a %b %d %H:%M:%S %Y",
    "%D": "%m\\/%d\\/%y",
    "%e": "%d",
    "%F": "%Y-%m-%d",
    "%h": "%b",
    "%R": "%H\\:%M",
    "%r": "%I\\:%M\\:%S\\s%p",
    "%T": "%H\\:%M\\:%S",
    "%x": "%m\\/%d\\/(?:%y|%Y)",
    "%X": "%H\\:%M\\:%S"
  };
  for (var matcher in EQUIVALENT_MATCHERS) {
    pattern = pattern.replace(matcher, EQUIVALENT_MATCHERS[matcher])
  }
  var DATE_PATTERNS = {
    "%a": "(?:Sun(?:day)?)|(?:Mon(?:day)?)|(?:Tue(?:sday)?)|(?:Wed(?:nesday)?)|(?:Thu(?:rsday)?)|(?:Fri(?:day)?)|(?:Sat(?:urday)?)",
    "%b": "(?:Jan(?:uary)?)|(?:Feb(?:ruary)?)|(?:Mar(?:ch)?)|(?:Apr(?:il)?)|May|(?:Jun(?:e)?)|(?:Jul(?:y)?)|(?:Aug(?:ust)?)|(?:Sep(?:tember)?)|(?:Oct(?:ober)?)|(?:Nov(?:ember)?)|(?:Dec(?:ember)?)",
    "%C": "\\d\\d",
    "%d": "0[1-9]|[1-9](?!\\d)|1\\d|2\\d|30|31",
    "%H": "\\d(?!\\d)|[0,1]\\d|20|21|22|23",
    "%I": "\\d(?!\\d)|0\\d|10|11|12",
    "%j": "00[1-9]|0?[1-9](?!\\d)|0?[1-9]\\d(?!\\d)|[1,2]\\d\\d|3[0-6]\\d",
    "%m": "0[1-9]|[1-9](?!\\d)|10|11|12",
    "%M": "0\\d|\\d(?!\\d)|[1-5]\\d",
    "%n": "\\s",
    "%p": "AM|am|PM|pm|A\\.M\\.|a\\.m\\.|P\\.M\\.|p\\.m\\.",
    "%S": "0\\d|\\d(?!\\d)|[1-5]\\d|60",
    "%U": "0\\d|\\d(?!\\d)|[1-4]\\d|50|51|52|53",
    "%W": "0\\d|\\d(?!\\d)|[1-4]\\d|50|51|52|53",
    "%w": "[0-6]",
    "%y": "\\d\\d",
    "%Y": "\\d\\d\\d\\d",
    "%%": "%",
    "%t": "\\s"
  };
  var MONTH_NUMBERS = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11
  };
  var DAY_NUMBERS_SUN_FIRST = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6
  };
  var DAY_NUMBERS_MON_FIRST = {
    MON: 0,
    TUE: 1,
    WED: 2,
    THU: 3,
    FRI: 4,
    SAT: 5,
    SUN: 6
  };
  for (var datePattern in DATE_PATTERNS) {
    pattern = pattern.replace(datePattern, "(" + datePattern + DATE_PATTERNS[datePattern] + ")")
  }
  var capture = [];
  for (var i = pattern.indexOf("%"); i >= 0; i = pattern.indexOf("%")) {
    capture.push(pattern[i + 1]);
    pattern = pattern.replace(new RegExp("\\%" + pattern[i + 1], "g"), "")
  }
  var matches = new RegExp("^" + pattern, "i").exec(UTF8ToString(buf));

  function initDate() {
    function fixup(value, min, max) {
      return typeof value !== "number" || isNaN(value) ? min : value >= min ? value <= max ? value : max : min
    }
    return {
      year: fixup(HEAP32[tm + 20 >> 2] + 1900, 1970, 9999),
      month: fixup(HEAP32[tm + 16 >> 2], 0, 11),
      day: fixup(HEAP32[tm + 12 >> 2], 1, 31),
      hour: fixup(HEAP32[tm + 8 >> 2], 0, 23),
      min: fixup(HEAP32[tm + 4 >> 2], 0, 59),
      sec: fixup(HEAP32[tm >> 2], 0, 59)
    }
  }
  if (matches) {
    var date = initDate();
    var value;
    var getMatch = function(symbol) {
      var pos = capture.indexOf(symbol);
      if (pos >= 0) {
        return matches[pos + 1]
      }
      return
    };
    if (value = getMatch("S")) {
      date.sec = parseInt(value)
    }
    if (value = getMatch("M")) {
      date.min = parseInt(value)
    }
    if (value = getMatch("H")) {
      date.hour = parseInt(value)
    } else if (value = getMatch("I")) {
      var hour = parseInt(value);
      if (value = getMatch("p")) {
        hour += value.toUpperCase()[0] === "P" ? 12 : 0
      }
      date.hour = hour
    }
    if (value = getMatch("Y")) {
      date.year = parseInt(value)
    } else if (value = getMatch("y")) {
      var year = parseInt(value);
      if (value = getMatch("C")) {
        year += parseInt(value) * 100
      } else {
        year += year < 69 ? 2e3 : 1900
      }
      date.year = year
    }
    if (value = getMatch("m")) {
      date.month = parseInt(value) - 1
    } else if (value = getMatch("b")) {
      date.month = MONTH_NUMBERS[value.substring(0, 3).toUpperCase()] || 0
    }
    if (value = getMatch("d")) {
      date.day = parseInt(value)
    } else if (value = getMatch("j")) {
      var day = parseInt(value);
      var leapYear = __isLeapYear(date.year);
      for (var month = 0; month < 12; ++month) {
        var daysUntilMonth = __arraySum(leapYear ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, month - 1);
        if (day <= daysUntilMonth + (leapYear ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[month]) {
          date.day = day - daysUntilMonth
        }
      }
    } else if (value = getMatch("a")) {
      var weekDay = value.substring(0, 3).toUpperCase();
      if (value = getMatch("U")) {
        var weekDayNumber = DAY_NUMBERS_SUN_FIRST[weekDay];
        var weekNumber = parseInt(value);
        var janFirst = new Date(date.year, 0, 1);
        var endDate;
        if (janFirst.getDay() === 0) {
          endDate = __addDays(janFirst, weekDayNumber + 7 * (weekNumber - 1))
        } else {
          endDate = __addDays(janFirst, 7 - janFirst.getDay() + weekDayNumber + 7 * (weekNumber - 1))
        }
        date.day = endDate.getDate();
        date.month = endDate.getMonth()
      } else if (value = getMatch("W")) {
        var weekDayNumber = DAY_NUMBERS_MON_FIRST[weekDay];
        var weekNumber = parseInt(value);
        var janFirst = new Date(date.year, 0, 1);
        var endDate;
        if (janFirst.getDay() === 1) {
          endDate = __addDays(janFirst, weekDayNumber + 7 * (weekNumber - 1))
        } else {
          endDate = __addDays(janFirst, 7 - janFirst.getDay() + 1 + weekDayNumber + 7 * (weekNumber - 1))
        }
        date.day = endDate.getDate();
        date.month = endDate.getMonth()
      }
    }
    var fullDate = new Date(date.year, date.month, date.day, date.hour, date.min, date.sec, 0);
    HEAP32[tm >> 2] = fullDate.getSeconds();
    HEAP32[tm + 4 >> 2] = fullDate.getMinutes();
    HEAP32[tm + 8 >> 2] = fullDate.getHours();
    HEAP32[tm + 12 >> 2] = fullDate.getDate();
    HEAP32[tm + 16 >> 2] = fullDate.getMonth();
    HEAP32[tm + 20 >> 2] = fullDate.getFullYear() - 1900;
    HEAP32[tm + 24 >> 2] = fullDate.getDay();
    HEAP32[tm + 28 >> 2] = __arraySum(__isLeapYear(fullDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, fullDate.getMonth() - 1) + fullDate.getDate() - 1;
    HEAP32[tm + 32 >> 2] = 0;
    return buf + intArrayFromString(matches[0]).length - 1
  }
  return 0
}

function _sysconf(name) {
  switch (name) {
    case 30:
      return PAGE_SIZE;
    case 85:
      var maxHeapSize = 2 * 1024 * 1024 * 1024 - 65536;
      return maxHeapSize / PAGE_SIZE;
    case 132:
    case 133:
    case 12:
    case 137:
    case 138:
    case 15:
    case 235:
    case 16:
    case 17:
    case 18:
    case 19:
    case 20:
    case 149:
    case 13:
    case 10:
    case 236:
    case 153:
    case 9:
    case 21:
    case 22:
    case 159:
    case 154:
    case 14:
    case 77:
    case 78:
    case 139:
    case 80:
    case 81:
    case 82:
    case 68:
    case 67:
    case 164:
    case 11:
    case 29:
    case 47:
    case 48:
    case 95:
    case 52:
    case 51:
    case 46:
      return 200809;
    case 79:
      return 0;
    case 27:
    case 246:
    case 127:
    case 128:
    case 23:
    case 24:
    case 160:
    case 161:
    case 181:
    case 182:
    case 242:
    case 183:
    case 184:
    case 243:
    case 244:
    case 245:
    case 165:
    case 178:
    case 179:
    case 49:
    case 50:
    case 168:
    case 169:
    case 175:
    case 170:
    case 171:
    case 172:
    case 97:
    case 76:
    case 32:
    case 173:
    case 35:
      return -1;
    case 176:
    case 177:
    case 7:
    case 155:
    case 8:
    case 157:
    case 125:
    case 126:
    case 92:
    case 93:
    case 129:
    case 130:
    case 131:
    case 94:
    case 91:
      return 1;
    case 74:
    case 60:
    case 69:
    case 70:
    case 4:
      return 1024;
    case 31:
    case 42:
    case 72:
      return 32;
    case 87:
    case 26:
    case 33:
      return 2147483647;
    case 34:
    case 1:
      return 47839;
    case 38:
    case 36:
      return 99;
    case 43:
    case 37:
      return 2048;
    case 0:
      return 2097152;
    case 3:
      return 65536;
    case 28:
      return 32768;
    case 44:
      return 32767;
    case 75:
      return 16384;
    case 39:
      return 1e3;
    case 89:
      return 700;
    case 71:
      return 256;
    case 40:
      return 255;
    case 2:
      return 100;
    case 180:
      return 64;
    case 25:
      return 20;
    case 5:
      return 16;
    case 6:
      return 6;
    case 73:
      return 4;
    case 84: {
      if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
      return 1
    }
  }
  ___setErrNo(28);
  return -1
}

function _time(ptr) {
  var ret = Date.now() / 1e3 | 0;
  if (ptr) {
    HEAP32[ptr >> 2] = ret
  }
  return ret
}

function _utime(path, times) {
  var time;
  if (times) {
    var offset = 4;
    time = HEAP32[times + offset >> 2];
    time *= 1e3
  } else {
    time = Date.now()
  }
  path = UTF8ToString(path);
  try {
    FS.utime(path, time, time);
    return 0
  } catch (e) {
    FS.handleFSError(e);
    return -1
  }
}
var VW = {
  init: function() {
    var NULL = 0;
    var STATUS_NOT_SET = 0;
    var STATUS_NOTIFY_KEY = 1;
    var STATUS_NOTIFY_RESIZE = 2;
    var STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE = 3;
    var STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE = 4;
    var STATUS_REQUEST_CMDLINE = 5;
    var STATUS_REQUEST_SHARED_BUF = 6;
    var STATUS_NOTIFY_ERROR_OUTPUT = 7;
    var STATUS_NOTIFY_EVAL_FUNC_RET = 8;

    function statusName(s) {
      switch (s) {
        case STATUS_NOT_SET:
          return "NOT_SET";
        case STATUS_NOTIFY_KEY:
          return "NOTIFY_KEY";
        case STATUS_NOTIFY_RESIZE:
          return "NOTIFY_RESIZE";
        case STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE:
          return "NOTIFY_OPEN_FILE_BUF_COMPLETE";
        case STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE:
          return "NOTIFY_CLIPBOARD_WRITE_COMPLETE";
        case STATUS_REQUEST_CMDLINE:
          return "REQUEST_CMDLINE";
        case STATUS_REQUEST_SHARED_BUF:
          return "REQUEST_SHARED_BUF";
        case STATUS_NOTIFY_ERROR_OUTPUT:
          return "NOTIFY_ERROR_OUTPUT";
        case STATUS_NOTIFY_EVAL_FUNC_RET:
          return "STATUS_NOTIFY_EVAL_FUNC_RET";
        default:
          return "Unknown command: " + s
      }
    }
    var guiWasmResizeShell;
    var guiWasmHandleKeydown;
    var guiWasmHandleDrop;
    var guiWasmSetClipAvail;
    var guiWasmDoCmdline;
    var guiWasmEmsg;
    var wasmMain;
    emscriptenRuntimeInitialized.then(function() {
      guiWasmResizeShell = Module.cwrap("gui_wasm_resize_shell", null, ["number", "number"]);
      guiWasmHandleKeydown = Module.cwrap("gui_wasm_handle_keydown", null, ["string", "number", "boolean", "boolean", "boolean", "boolean"]);
      guiWasmHandleDrop = Module.cwrap("gui_wasm_handle_drop", null, ["string"]);
      guiWasmSetClipAvail = Module.cwrap("gui_wasm_set_clip_avail", null, ["boolean"]);
      guiWasmDoCmdline = Module.cwrap("gui_wasm_do_cmdline", "boolean", ["string"]);
      guiWasmEmsg = Module.cwrap("gui_wasm_emsg", null, ["string"]);
      wasmMain = Module.cwrap("wasm_main", null, ["number", "number"])
    }).catch(console.error);
    var SharedBuffers = function() {
      function SharedBuffers() {
        this.buffers = new Map;
        this.nextID = 1
      }
      SharedBuffers.prototype.createBuffer = function(bytes) {
        var buf = new SharedArrayBuffer(bytes);
        var id = this.nextID++;
        this.buffers.set(id, buf);
        return [id, buf]
      };
      SharedBuffers.prototype.takeBuffer = function(status, bufId) {
        var buf = this.buffers.get(bufId);
        if (buf === undefined) {
          throw new Error("Received " + statusName(status) + " event but no shared buffer for buffer ID " + bufId)
        }
        this.buffers.delete(bufId);
        return buf
      };
      return SharedBuffers
    }();
    var VimWasmRuntime = function() {
      function VimWasmRuntime() {
        var _this = this;
        onmessage = function(e) {
          return _this.onMessage(e.data)
        };
        this.domWidth = 0;
        this.domHeight = 0;
        this.perf = false;
        this.syncfsOnExit = false;
        this.started = false;
        this.sharedBufs = new SharedBuffers;
        this.buffer = new Int32Array
      }
      VimWasmRuntime.prototype.draw = function() {
        var event = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          event[_i] = arguments[_i]
        }
        this.sendMessage({
          kind: "draw",
          event: event
        })
      };
      VimWasmRuntime.prototype.vimStarted = function() {
        this.sendMessage({
          kind: "started"
        })
      };
      VimWasmRuntime.prototype.sendError = function(err) {
        this.sendMessage({
          kind: "error",
          message: err.message || err.toString()
        });
        console.log("Error was thrown in worker:", err)
      };
      VimWasmRuntime.prototype.onMessage = function(msg) {
        var _this = this;
        console.log("Received from main:", msg);
        switch (msg.kind) {
          case "start":
            emscriptenRuntimeInitialized.then(function() {
              return _this.start(msg)
            }).catch(function(e) {
              switch (e.name) {
                case "ExitStatus":
                  console.log("Vim exited with status", e.status);
                  _this.shutdownFileSystem().catch(function(err) {
                    console.error("worker: Could not shutdown filesystem:", err)
                  }).then(function() {
                    _this.printPerfs();
                    console.log("Finally sending exit message", e.status);
                    _this.sendMessage({
                      kind: "exit",
                      status: e.status
                    })
                  }).catch(function(err) {
                    return _this.sendError(err)
                  });
                  break;
                default:
                  _this.sendError(e);
                  break
              }
            });
            break;
          default:
            throw new Error("Unhandled message from main thread: " + msg)
        }
      };
      VimWasmRuntime.prototype.start = function(msg) {
        var _this = this;
        if (this.started) {
          throw new Error("Vim cannot start because it is already running")
        }
        if (msg.debug) {
          debug = console.log.bind(console, "worker:")
        }
        this.domWidth = msg.canvasDomWidth;
        this.domHeight = msg.canvasDomHeight;
        this.buffer = msg.buffer;
        this.perf = msg.perf;
        var willPrepare = this.prepareFileSystem(msg.persistent, msg.dirs, msg.files, msg.fetchFiles);
        if (!msg.clipboard) {
          guiWasmSetClipAvail(false)
        }
        return willPrepare.then(function() {
          return _this.main(msg.cmdArgs)
        })
      };
      VimWasmRuntime.prototype.waitAndHandleEventFromMain = function(timeout) {
        var start = Date.now();
        var status = this.waitForStatusChanged(timeout);
        var elapsed = 0;
        if (status === STATUS_NOT_SET) {
          elapsed = Date.now() - start;
          console.log("No event happened after", timeout, "ms timeout. Elapsed:", elapsed);
          return elapsed
        }
        this.handleEvent(status);
        elapsed = Date.now() - start;
        console.log("Event", statusName(status), status, "was handled with ms", elapsed);
        return elapsed
      };
      VimWasmRuntime.prototype.exportFile = function(fullpath) {
        try {
          var contents = FS.readFile(fullpath).buffer;
          console.log("Read", contents.byteLength, "bytes contents from", fullpath);
          this.sendMessage({
            kind: "export",
            path: fullpath,
            contents: contents
          }, [contents]);
          return true
        } catch (err) {
          console.log("Could not export file", fullpath, "due to error:", err);
          return false
        }
      };
      VimWasmRuntime.prototype.readClipboard = function() {
        this.sendMessage({
          kind: "read-clipboard:request"
        });
        this.waitUntilStatus(STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE);
        var isError = !!this.buffer[1];
        var bufId = this.buffer[2];
        this.receiveDone(STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE);
        if (isError) {
          guiWasmSetClipAvail(false);
          return NULL
        }
        var buffer = this.sharedBufs.takeBuffer(STATUS_NOTIFY_CLIPBOARD_WRITE_COMPLETE, bufId);
        var arr = new Uint8Array(buffer);
        arr[arr.byteLength - 1] = 0;
        var ptr = Module._malloc(arr.byteLength);
        if (ptr === NULL) {
          return NULL
        }
        Module.HEAPU8.set(arr, ptr);
        console.log("Malloced", arr.byteLength, "bytes and wrote clipboard text");
        return ptr
      };
      VimWasmRuntime.prototype.writeClipboard = function(text) {
        console.log("Send clipboard text:", text);
        this.sendMessage({
          kind: "write-clipboard",
          text: text
        })
      };
      VimWasmRuntime.prototype.setTitle = function(title) {
        console.log("Send window title:", title);
        this.sendMessage({
          kind: "title",
          title: title
        })
      };
      VimWasmRuntime.prototype.evalJS = function(file) {
        try {
          var contents = FS.readFile(file).buffer;
          this.sendMessage({
            kind: "eval",
            path: file,
            contents: contents
          }, [contents]);
          console.log("Sent JavaScript file:", file);
          return 1
        } catch (err) {
          console.log("Could not read file", file, ":", err);
          guiWasmEmsg("E9999: Could not access " + file + ": " + err.message);
          return 0
        }
      };
      VimWasmRuntime.prototype.evalJavaScriptFunc = function(func, argsJson, notifyOnly) {
        console.log("Will send function and args to main for jsevalfunc():", func, argsJson, notifyOnly);
        this.sendMessage({
          kind: "evalfunc",
          body: func,
          argsJson: argsJson,
          notifyOnly: notifyOnly
        });
        if (notifyOnly) {
          console.log("Evaluating JavaScript does not require result", func);
          return 0
        }
        this.waitUntilStatus(STATUS_NOTIFY_EVAL_FUNC_RET);
        var isError = this.buffer[1];
        var bufId = this.buffer[2];
        this.receiveDone(STATUS_NOTIFY_EVAL_FUNC_RET);
        var buffer = this.sharedBufs.takeBuffer(STATUS_NOTIFY_EVAL_FUNC_RET, bufId);
        var arr = new Uint8Array(buffer);
        if (isError) {
          var decoder = new TextDecoder;
          guiWasmEmsg(decoder.decode(new Uint8Array(arr)));
          return NULL
        }
        var ptr = Module._malloc(arr.byteLength + 1);
        if (ptr === NULL) {
          return NULL
        }
        Module.HEAPU8.set(arr, ptr);
        Module.HEAPU8[ptr + arr.byteLength] = NULL;
        console.log("Malloced", arr.byteLength, "bytes and wrote evaluated function result", arr.byteLength, "bytes");
        return ptr
      };
      VimWasmRuntime.prototype.main = function(args) {
        this.started = true;
        console.log("Start main function() with args", args);
        if (args.length === 0) {
          wasmMain(0, NULL);
          return
        }
        args.unshift("vim");
        var argvBuf = new Uint32Array(args.length + 1);
        var argsPtr = Module._malloc(args.reduce(function(acc, a) {
          return acc + a.length * 4 + 1
        }, 0));
        for (var i = 0, offset = 0; i < args.length; i++) {
          var arg = args[i];
          var bytes = arg.length * 4;
          var ptr = argsPtr + offset;
          stringToUTF8(arg, ptr, bytes);
          offset += bytes + 1;
          argvBuf[i] = ptr
        }
        argvBuf[args.length] = NULL;
        var argvPtr = Module._malloc(argvBuf.byteLength);
        Module.HEAPU8.set(new Uint8Array(argvBuf.buffer), argvPtr);
        wasmMain(args.length, argvPtr)
      };
      VimWasmRuntime.prototype.preloadFiles = function(files, remoteFiles) {
        for (var _i = 0, _a = Object.keys(files); _i < _a.length; _i++) {
          var fpath = _a[_i];
          try {
            FS.writeFile(fpath, files[fpath], {
              flags: "wx+"
            })
          } catch (e) {
            console.log("Could not create file:", fpath, e)
          }
        }
        var paths = Object.keys(remoteFiles);
        return Promise.all(paths.map(function(path) {
          var remotePath = remoteFiles[path];
          return fetch(remotePath).then(function(res) {
            if (!res.ok) {
              throw new Error("Response of request to {remotePath} was not successful: " + res.status + ": " + res.statusText)
            }
            return res.text()
          }).then(function(text) {
            try {
              FS.writeFile(path, text, {
                flags: "wx+"
              });
              console.log("Fetched file from", remotePath, "to", path)
            } catch (e) {
              console.log("Could not create file", path, "fetched from", remotePath, e, text)
            }
          }).catch(function(err) {
            console.log("Could not fetch file:", path, err)
          })
        }))
      };
      VimWasmRuntime.prototype.prepareFileSystem = function(persistentDirs, mkdirs, userFiles, remoteFiles) {
        var _a;
        var _this = this;
        var dotvim = "/home/web_user/.vim";
        var vimrc = '" Write your favorite config!\n\nset expandtab tabstop=4 shiftwidth=4 softtabstop=4\ncolorscheme onedark\nsyntax enable\n';
        var files = (_a = {}, _a[dotvim + "/vimrc"] = vimrc, _a);
        Object.assign(files, userFiles);
        FS.mkdir(dotvim);
        for (var _i = 0, mkdirs_1 = mkdirs; _i < mkdirs_1.length; _i++) {
          var dir = mkdirs_1[_i];
          FS.mkdir(dir)
        }
        console.log("Created directories:", mkdirs);
        if (persistentDirs.length === 0) {
          return this.preloadFiles(files, remoteFiles).then(function() {
            console.log("Created files on MEMFS", files, remoteFiles)
          })
        }
        this.perfMark("idbfs-init");

        for (var _b = 0, persistentDirs_1 = persistentDirs; _b < persistentDirs_1.length; _b++) {
          var dir = persistentDirs_1[_b];
          FS.mount(IDBFS, {}, dir)
        }

        this.syncfsOnExit = true;

        // XXX
        var vimrcpath = '/home/web_user/.vim/vimrc';

        // Default vimrc. This must come BEFORE setupOnWrite, or else the
        // onWrite callback gets triggered, which results in the default
        // vimrc getting written to IndexedDB.
        FS.writeFile(vimrcpath, vimrc);

        this.setupOnWrite();

        return new Promise(async function(resolve, reject) {
          var fnames = JSON.parse(self.name);
          if (fnames.length <= 0) {
            resolve();
            return;
          }
          FS.loadFilesFromDB(fnames, function() {
            resolve();
          }, function(arguments) {
            console.error('FS.loadFilesFromDB failed with error', arguments);
            reject(arguments);
          });
        })
      };
      // XXX
      VimWasmRuntime.prototype.setupOnWrite = function() {
        // Set up writecallback so that when vimrc is written to, we sync the filesystem.
        var _this = this;
        FS.trackingDelegate['onWriteToFile'] = function(path) {
          // Ignore these files.
          debug('onWriteToFile', path);
          if (path === '/dev/tty1' || path.endsWith('.swp')) {
            return;
          }

          var file = FS.analyzePath(path).object.contents;
          if (!file) { return; }

          // PROBLEM: need to be able to STOP THE WORLD when I do a write,
          // right HERE. If the thread keeps going, it hits Atomics.wait,
          // which wrecks the callbacks of indexedDB.
          //
          // Solution 1: move indexeddb to a thread.
          //  CON: that's A LOT of data copying to a new thread.
          //    we have to create a whole new buffer, copy the file in, transfer
          //    to main thread via postMessage, then main thread will write to
          //    IndexedDB.
          //
          // Solution 2: sleep this thread as soon as the data is transferred.
          // Main thread will wake this up when the indexedDB ops are done.
          //
          // On startup, we read all the files from indexedDB and write into
          // MEMFS.
          try {
            // If I'm being honest, I don't know why this works. I thought
            // we needed to do a deep clone of file.buffer but apparently
            // this works.
            _this.sendMessage({
              kind: "writeFile",
              file: file.buffer,
              fname: path
            }, file.buffer);
          } catch(e) {
            console.error(e);
          }
        }
      }
      VimWasmRuntime.prototype.shutdownFileSystem = function() {
        var _this = this;
        if (!this.syncfsOnExit) {
          console.log("syncfs() was skipped because of no persistent directory");
          return Promise.resolve()
        }
        return new Promise(function(resolve, reject) {
          _this.perfMark("idbfs-fin");
          FS.syncfs(false, function(err) {
            if (err) {
              console.log("Could not save persistent directories:", err);
              reject(err);
              return
            }
            console.log("Synchronized IDBFS for persistent directories");
            resolve();
            _this.perfMeasure("idbfs-fin")
          })
        })
      };
      VimWasmRuntime.prototype.waitUntilStatus = function(status) {
        var event = statusName(status);
        while (true) {
          var s = this.waitForStatusChanged(undefined);
          if (s === status) {
            console.log("Wait completed for", event, status);
            return
          }
          if (s === STATUS_NOT_SET) {
            continue
          }
          this.handleEvent(s);
          console.log("Event", statusName(s), s, "was handled while waiting for", event, status)
        }
      };
      VimWasmRuntime.prototype.waitForStatusChanged = function(timeout) {
        console.log("Waiting for any event from main with timeout", timeout);
        var status = this.eventStatus();
        if (status !== STATUS_NOT_SET) {
          return status
        }
        if (Atomics.wait(this.buffer, 0, STATUS_NOT_SET, timeout) === "timed-out") {
          console.log("No event happened after", timeout, "ms timeout");
          return STATUS_NOT_SET
        }
        return this.eventStatus()
      };
      VimWasmRuntime.prototype.eventStatus = function() {
        return Atomics.load(this.buffer, 0)
      };
      VimWasmRuntime.prototype.handleEvent = function(s) {
        switch (s) {
          case STATUS_NOTIFY_KEY:
            this.handleKeyEvent();
            return;
          case STATUS_NOTIFY_RESIZE:
            this.handleResizeEvent();
            return;
          case STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE:
            this.handleOpenFileWriteComplete();
            return;
          case STATUS_REQUEST_CMDLINE:
            this.handleRunCommand();
            return;
          case STATUS_REQUEST_SHARED_BUF:
            this.handleSharedBufRequest();
            return;
          case STATUS_NOTIFY_ERROR_OUTPUT:
            this.handleErrorOutput();
            return;
          default:
            throw new Error("Cannot handle event " + statusName(s) + " (" + s + ")")
        }
      };
      VimWasmRuntime.prototype.handleErrorOutput = function() {
        var bufId = this.buffer[1];
        this.receiveDone(STATUS_NOTIFY_ERROR_OUTPUT);
        console.log("Read error output payload with 4 bytes");
        var sharedBuf = new Uint8Array(this.sharedBufs.takeBuffer(STATUS_NOTIFY_ERROR_OUTPUT, bufId));
        var buffer = new Uint8Array(sharedBuf);
        var message = (new TextDecoder).decode(buffer);
        var output = "E9999: " + message;
        var lines = output.split("\n");
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
          var line = lines_1[_i];
          guiWasmEmsg(line)
        }
        console.log("Output error message:", output)
      };
      VimWasmRuntime.prototype.handleRunCommand = function() {
        var _a = this.decodeStringFromBuffer(1),
          idx = _a[0],
          cmdline = _a[1];
        this.receiveDone(STATUS_REQUEST_CMDLINE);
        console.log("Read cmdline request payload with", idx * 4, "bytes");
        var success = guiWasmDoCmdline(cmdline);
        this.sendMessage({
          kind: "cmdline:response",
          success: success
        })
      };
      VimWasmRuntime.prototype.handleSharedBufRequest = function() {
        var size = this.buffer[1];
        this.receiveDone(STATUS_REQUEST_SHARED_BUF);
        console.log("Read shared buffer request event payload. Size:", size);
        var _a = this.sharedBufs.createBuffer(size),
          bufId = _a[0],
          buffer = _a[1];
        this.sendMessage({
          kind: "shared-buf:response",
          buffer: buffer,
          bufId: bufId
        })
      };
      VimWasmRuntime.prototype.handleOpenFileWriteComplete = function() {
        var bufId = this.buffer[1];
        var _a = this.decodeStringFromBuffer(2),
          idx = _a[0],
          fileName = _a[1];
        this.receiveDone(STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE);
        console.log("Read open file write complete event payload with", idx * 4, "bytes");
        var buffer = this.sharedBufs.takeBuffer(STATUS_NOTIFY_OPEN_FILE_BUF_COMPLETE, bufId);
        console.log("Handle file", fileName, "open with", buffer.byteLength, "bytes buffer on file write complete event");
        var filePath = "/" + fileName;
        FS.writeFile(filePath, new Uint8Array(buffer));
        console.log("Created file", filePath, "on in-memory filesystem");
        guiWasmHandleDrop(filePath)
      };
      VimWasmRuntime.prototype.handleResizeEvent = function() {
        var idx = 1;
        var width = this.buffer[idx++];
        var height = this.buffer[idx++];
        this.receiveDone(STATUS_NOTIFY_RESIZE);
        this.domWidth = width;
        this.domHeight = height;
        guiWasmResizeShell(width, height);
        console.log("Resize event was handled", width, height)
      };
      VimWasmRuntime.prototype.handleKeyEvent = function() {
        var idx = 1;
        var keyCode = this.buffer[idx++];
        var ctrl = !!this.buffer[idx++];
        var shift = !!this.buffer[idx++];
        var alt = !!this.buffer[idx++];
        var meta = !!this.buffer[idx++];
        var read = this.decodeStringFromBuffer(idx);
        idx = read[0];
        var key = read[1];
        this.receiveDone(STATUS_NOTIFY_KEY);
        console.log("Read key event payload with", idx * 4, "bytes");
        guiWasmHandleKeydown(key, keyCode, ctrl, shift, alt, meta);
        console.log("Key event was handled", key, keyCode, ctrl, shift, alt, meta)
      };
      VimWasmRuntime.prototype.decodeStringFromBuffer = function(idx) {
        var len = this.buffer[idx++];
        var chars = [];
        for (var i = 0; i < len; i++) {
          chars.push(this.buffer[idx++])
        }
        var s = String.fromCharCode.apply(String, chars);
        return [idx, s]
      };
      VimWasmRuntime.prototype.sendMessage = function(msg, transfer) {
        if (this.perf) {
          msg.timestamp = Date.now()
        }
        postMessage(msg, transfer)
      };
      VimWasmRuntime.prototype.receiveDone = function(status) {
        Atomics.store(this.buffer, 0, STATUS_NOT_SET);
        this.sendMessage({
          kind: "done",
          status: status
        })
      };
      VimWasmRuntime.prototype.perfMark = function(m) {
        if (this.perf) {
          performance.mark(m)
        }
      };
      VimWasmRuntime.prototype.perfMeasure = function(m) {
        if (this.perf) {
          performance.measure(m, m);
          performance.clearMarks(m)
        }
      };
      VimWasmRuntime.prototype.printPerfs = function() {
        if (!this.perf) {
          return
        }
        var entries = performance.getEntriesByType("measure").map(function(e) {
          return {
            name: e.name,
            "duration (ms)": e.duration,
            "start (ms)": e.startTime
          }
        });
        console.log("%cWorker Measurements", "color: green; font-size: large");
        console.table(entries)
      };
      return VimWasmRuntime
    }();
    VW.runtime = new VimWasmRuntime
  }
};

function _vimwasm_call_shell(cmd) {
  return VW.runtime.evalJS(UTF8ToString(cmd))
}

function _vimwasm_draw_rect(x, y, w, h, color, filled) {
  VW.runtime.draw("drawRect", [x, y, w, h, UTF8ToString(color), !!filled])
}

function _vimwasm_draw_text(charHeight, lineHeight, charWidth, x, y, str, len, bold, underline, undercurl, strike) {
  var text = UTF8ToString(str, len);
  VW.runtime.draw("drawText", [text, charHeight, lineHeight, charWidth, x, y, !!bold, !!underline, !!undercurl, !!strike])
}

function _vimwasm_eval_js(scriptPtr, argsJsonPtr, justNotify) {
  var script = UTF8ToString(scriptPtr);
  var argsJson = argsJsonPtr === 0 ? undefined : UTF8ToString(argsJsonPtr);
  return VW.runtime.evalJavaScriptFunc(script, argsJson, !!justNotify)
}

function _vimwasm_export_file(fullpath) {
  return +VW.runtime.exportFile(UTF8ToString(fullpath))
}

function _vimwasm_get_dom_height() {
  console.log("get_dom_height:", VW.runtime.domHeight);
  return VW.runtime.domHeight
}

function _vimwasm_get_dom_width() {
  console.log("get_dom_width:", VW.runtime.domWidth);
  return VW.runtime.domWidth
}

function _vimwasm_get_mouse_x() {
  console.log("get_mouse_x:");
  return 0
}

function _vimwasm_get_mouse_y() {
  console.log("get_mouse_y:");
  return 0
}

function _vimwasm_image_scroll(x, sy, dy, w, h) {
  VW.runtime.draw("imageScroll", [x, sy, dy, w, h])
}

function _vimwasm_invert_rect(x, y, w, h) {
  VW.runtime.draw("invertRect", [x, y, w, h])
}

function _vimwasm_is_font(fontNamePtr) {
  var fontName = UTF8ToString(fontNamePtr);
  console.log("is_font:", fontName);
  return 1
}

function _vimwasm_is_supported_key(keyNamePtr) {
  var keyName = UTF8ToString(keyNamePtr);
  console.log("is_supported_key:", keyName);
  return 1
}

function _vimwasm_read_clipboard() {
  return VW.runtime.readClipboard()
}

function _vimwasm_resize(width, height) {
  console.log("resize:", width, height)
}

function _vimwasm_set_bg_color(name) {
  VW.runtime.draw("setColorBG", [UTF8ToString(name)])
}

function _vimwasm_set_fg_color(name) {
  VW.runtime.draw("setColorFG", [UTF8ToString(name)])
}

function _vimwasm_set_font(name, size) {
  VW.runtime.draw("setFont", [UTF8ToString(name), size])
}

function _vimwasm_set_sp_color(name) {
  VW.runtime.draw("setColorSP", [UTF8ToString(name)])
}

function _vimwasm_set_title(title) {
  VW.runtime.setTitle(UTF8ToString(title))
}

function _vimwasm_wait_for_event(timeout) {
  return VW.runtime.waitAndHandleEventFromMain(timeout > 0 ? timeout : undefined)
}

function _vimwasm_will_init() {
  VW.runtime.vimStarted()
}

function _vimwasm_write_clipboard(textPtr, size) {
  var text = UTF8ToString(textPtr, size);
  VW.runtime.writeClipboard(text)
}

if (ENVIRONMENT_IS_NODE) {
  _emscripten_get_now = function _emscripten_get_now_actual() {
    var t = process["hrtime"]();
    return t[0] * 1e3 + t[1] / 1e6
  }
} else if (typeof dateNow !== "undefined") {
  _emscripten_get_now = dateNow
} else _emscripten_get_now = function() {
  return performance["now"]()
};
FS.staticInit();
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
VW.init();

function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array
}
var asmLibraryArg = {
  Ea: ___assert_fail,
  ha: ___clock_gettime,
  k: ___lock,
  ga: ___map_file,
  _: ___syscall10,
  q: ___syscall12,
  ia: ___syscall122,
  Z: ___syscall133,
  m: ___syscall15,
  E: ___syscall168,
  ca: ___syscall183,
  ka: ___syscall191,
  ea: ___syscall194,
  n: ___syscall195,
  G: ___syscall196,
  K: ___syscall197,
  $: ___syscall199,
  W: ___syscall20,
  X: ___syscall200,
  T: ___syscall207,
  S: ___syscall212,
  fa: ___syscall220,
  c: ___syscall221,
  aa: ___syscall3,
  da: ___syscall33,
  la: ___syscall340,
  Y: ___syscall36,
  O: ___syscall38,
  J: ___syscall39,
  R: ___syscall4,
  Q: ___syscall40,
  P: ___syscall41,
  o: ___syscall5,
  r: ___syscall54,
  I: ___syscall60,
  V: ___syscall85,
  F: ___syscall91,
  H: ___syscall94,
  e: ___unlock,
  Ga: __exit,
  Ha: _dlclose,
  h: _dlerror,
  Ja: _dlopen,
  Ia: _dlsym,
  A: _emscripten_memcpy_big,
  B: _emscripten_resize_heap,
  Ma: _endpwent,
  C: _environ_get,
  D: _environ_sizes_get,
  g: _exit,
  f: _fd_close,
  p: _fd_fdstat_get,
  L: _fd_read,
  z: _fd_seek,
  ba: _fd_sync,
  N: _fd_write,
  Na: _getpwent,
  l: _getpwnam,
  Ka: _getpwuid,
  b: _gettimeofday,
  j: _kill,
  M: _localtime_r,
  memory: wasmMemory,
  ra: _mktime,
  La: _nanosleep,
  Oa: _setpwent,
  a: _signal,
  i: _strftime,
  Aa: _strptime,
  x: _sysconf,
  table: wasmTable,
  d: _time,
  U: _tzset,
  Da: _utime,
  ma: _vimwasm_call_shell,
  u: _vimwasm_draw_rect,
  ua: _vimwasm_draw_text,
  y: _vimwasm_eval_js,
  ja: _vimwasm_export_file,
  za: _vimwasm_get_dom_height,
  Ba: _vimwasm_get_dom_width,
  pa: _vimwasm_get_mouse_x,
  oa: _vimwasm_get_mouse_y,
  s: _vimwasm_image_scroll,
  sa: _vimwasm_invert_rect,
  ya: _vimwasm_is_font,
  ta: _vimwasm_is_supported_key,
  Fa: _vimwasm_read_clipboard,
  w: _vimwasm_resize,
  wa: _vimwasm_set_bg_color,
  xa: _vimwasm_set_fg_color,
  v: _vimwasm_set_font,
  va: _vimwasm_set_sp_color,
  na: _vimwasm_set_title,
  t: _vimwasm_wait_for_event,
  Ca: _vimwasm_will_init,
  qa: _vimwasm_write_clipboard
};
var asm = createWasm();
Module["asm"] = asm;
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
  return Module["asm"]["Pa"].apply(null, arguments)
};
var _malloc = Module["_malloc"] = function() {
  return Module["asm"]["Qa"].apply(null, arguments)
};
var _free = Module["_free"] = function() {
  return Module["asm"]["Ra"].apply(null, arguments)
};
var _fflush = Module["_fflush"] = function() {
  return Module["asm"]["Sa"].apply(null, arguments)
};
var ___errno_location = Module["___errno_location"] = function() {
  return Module["asm"]["Ta"].apply(null, arguments)
};
var _gui_wasm_handle_keydown = Module["_gui_wasm_handle_keydown"] = function() {
  return Module["asm"]["Ua"].apply(null, arguments)
};
var _gui_wasm_resize_shell = Module["_gui_wasm_resize_shell"] = function() {
  return Module["asm"]["Va"].apply(null, arguments)
};
var _gui_wasm_handle_drop = Module["_gui_wasm_handle_drop"] = function() {
  return Module["asm"]["Wa"].apply(null, arguments)
};
var _gui_wasm_set_clip_avail = Module["_gui_wasm_set_clip_avail"] = function() {
  return Module["asm"]["Xa"].apply(null, arguments)
};
var _gui_wasm_do_cmdline = Module["_gui_wasm_do_cmdline"] = function() {
  return Module["asm"]["Ya"].apply(null, arguments)
};
var _gui_wasm_emsg = Module["_gui_wasm_emsg"] = function() {
  return Module["asm"]["Za"].apply(null, arguments)
};
var _wasm_main = Module["_wasm_main"] = function() {
  return Module["asm"]["_a"].apply(null, arguments)
};
var __get_tzname = Module["__get_tzname"] = function() {
  return Module["asm"]["$a"].apply(null, arguments)
};
var __get_daylight = Module["__get_daylight"] = function() {
  return Module["asm"]["ab"].apply(null, arguments)
};
var __get_timezone = Module["__get_timezone"] = function() {
  return Module["asm"]["bb"].apply(null, arguments)
};
var stackSave = Module["stackSave"] = function() {
  return Module["asm"]["cb"].apply(null, arguments)
};
var stackAlloc = Module["stackAlloc"] = function() {
  return Module["asm"]["db"].apply(null, arguments)
};
var stackRestore = Module["stackRestore"] = function() {
  return Module["asm"]["eb"].apply(null, arguments)
};
var dynCall_vi = Module["dynCall_vi"] = function() {
  return Module["asm"]["fb"].apply(null, arguments)
};
Module["asm"] = asm;
Module["cwrap"] = cwrap;
Module["getMemory"] = getMemory;
Module["addRunDependency"] = addRunDependency;
Module["removeRunDependency"] = removeRunDependency;
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
Module["calledRun"] = calledRun;
var calledRun;

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status
}
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller
};

function run(args) {
  args = args || arguments_;
  if (runDependencies > 0) {
    return
  }
  preRun();
  if (runDependencies > 0) return;

  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    postRun()
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function() {
      setTimeout(function() {
        Module["setStatus"]("")
      }, 1);
      doRun()
    }, 1)
  } else {
    doRun()
  }
}
Module["run"] = run;

function exit(status, implicit) {
  if (implicit && noExitRuntime && status === 0) {
    return
  }
  if (noExitRuntime) {} else {
    ABORT = true;
    EXITSTATUS = status;
    exitRuntime();
    if (Module["onExit"]) Module["onExit"](status)
  }
  quit_(status, new ExitStatus(status))
}
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()()
  }
}
run();
