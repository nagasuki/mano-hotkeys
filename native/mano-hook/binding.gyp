{
  "targets": [
    {
      "target_name": "mano_hook",
      "sources": [ "src/addon.cc" ],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include_dir\")"
      ],
      "defines": [ "NAPI_VERSION=8", "NOMINMAX", "WIN32_LEAN_AND_MEAN" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        [ "OS==\"win\"", {
          "libraries": [ "-luser32.lib" ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": [ "/std:c++17", "/utf-8" ]
            }
          }
        } ]
      ]
    }
  ]
}
