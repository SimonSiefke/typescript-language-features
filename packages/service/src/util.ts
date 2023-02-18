import * as fs from 'fs'
import * as path from 'path'

type IntellicodeModelJson = {
  readonly languageName: string
  readonly filePath: string
}[]

type TypescriptLanguageServicePlugin = (modules: {
  typescript: typeof import('typescript/lib/typescript')
}) => {
  create: (info: any) => import('typescript').LanguageService
}

const createIntellicodePlugin: (
  intellicodePath: string | undefined
) =>
  | { plugin: TypescriptLanguageServicePlugin; modelPath: string }
  | undefined = (intellicodePath) => {
  if (!intellicodePath) {
    return undefined
  }
  const intellicodePluginPath = path.join(
    intellicodePath,
    'node_modules/@vsintellicode/typescript-intellicode-plugin/lib/index.js'
  )
  const modelJsonPath = path.join(intellicodePath, 'cache/models.json')
  if (!fs.existsSync(intellicodePluginPath) || !fs.existsSync(modelJsonPath)) {
    return undefined
  }
  const intellicode = eval('require')(
    intellicodePluginPath
  ) as TypescriptLanguageServicePlugin
  const modelJson = eval('require')(modelJsonPath) as IntellicodeModelJson
  const jsModel = modelJson.find((model) => model.languageName === 'javascript')
  if (!jsModel) {
    console.log('intellicode no js model')
    return undefined
  }
  console.log('success intellicode model')
  return {
    plugin: intellicode,
    modelPath: jsModel.filePath,
  }
  // jsModel.filePath
  // console.log(JSON.stringify(modelJson))
  // console.log('GOT INTELLICODE')
}

const cachedScriptSnapshots: {
  [key: string]: import('typescript').IScriptSnapshot
} = Object.create(null)

const cachedFileExists: { [key: string]: boolean } = Object.create(null)

const cachedDirectoryExists: { [key: string]: boolean } = Object.create(null)

const cachedReadFile: { [key: string]: string | undefined } =
  Object.create(null)

const cachedResolvedModules: {
  [dirname: string]: {
    [moduleName: string]: import('typescript').ResolvedModuleFull | undefined
  }
} = Object.create(null)

export const createTypescriptLanguageService = (
  absolutePath: string,
  typescript: typeof import('typescript/lib/typescript'),
  intellicodePath: string | undefined,
  hasFile: (path: string) => boolean,
  getFileVersion: (path: string) => string,
  getFileContent: (path: string) => string
) => {
  const withIntellicode: (
    languageService: import('typescript').LanguageService,
    languageServiceHost: import('typescript').LanguageServiceHost,
    intellicodePath: string | undefined
  ) => import('typescript').LanguageService = (
    languageService,
    languageServiceHost,
    intellicodePath
  ) => {
    if (!intellicodePath) {
      return languageService
    }
    const intellicode = createIntellicodePlugin(intellicodePath)

    if (!intellicode) {
      return languageService
    }
    const info: any = {
      languageService,
      languageServiceHost,
      serverHost: undefined as any,
      project: undefined as any,
      config: {
        modelPath: intellicode.modelPath,
      },
    }
    console.log('ENABLED INTELLICODE')
    return intellicode.plugin({ typescript }).create(info)
  }
  const configFilePath = typescript.findConfigFile(
    absolutePath,
    typescript.sys.fileExists,
    'tsconfig.json'
  )
  const configDirname = path.dirname(configFilePath as string)

  const configJson = typescript.readConfigFile(
    configFilePath as string,
    typescript.sys.readFile
  ).config

  const parsedConfig = typescript.parseJsonConfigFileContent(
    configJson,
    {
      fileExists: typescript.sys.fileExists,
      readDirectory: typescript.sys.readDirectory,
      readFile: (path) => {
        console.log('READ FILE1' + path)
        return typescript.sys.readFile(path)
      },
      useCaseSensitiveFileNames: true,
    },
    path.dirname(configFilePath as string),
    {
      allowJs: true,
      checkJs: true,
    },
    configFilePath,
    undefined,
    []
  )

  console.log(parsedConfig.fileNames)
  console.log(parsedConfig.options)

  const caseSensitiveFileNames = true
  const newLine = '\n'
  const compilationSettings = parsedConfig.options
  // const currentDirectory = path.dirname(configFilePath as string)
  const currentDirectory = typescript.sys.getCurrentDirectory()
  const scriptFileNames = parsedConfig.fileNames
  // const defaultLibFileName1 = typescript.getDefaultLibFilePath(
  //   parsedConfig.options
  // )
  // console.log(defaultLibFileName1)
  const defaultLibFileName = path.join(__dirname, '../lib/lib.d.ts')
  console.log('default lib')
  console.log(defaultLibFileName)
  const languageServiceHost: import('typescript').LanguageServiceHost = {
    resolveTypeReferenceDirectives: (
      typeDirectiveNames,
      containingFile,
      redirectedReference,
      options
    ) => {
      return typeDirectiveNames.map(
        (typeDirectiveName) =>
          typescript.resolveTypeReferenceDirective(
            typeDirectiveName.toString(),
            containingFile,
            options,
            {
              fileExists: typescript.sys.fileExists,
              readFile: typescript.sys.readFile,
              directoryExists: typescript.sys.directoryExists,
              getCurrentDirectory: typescript.sys.getCurrentDirectory,
            }
          ).resolvedTypeReferenceDirective
      )
    },
    resolveModuleNames: (
      moduleNames,
      containingFile,
      reusedNames,
      redirectedReference,
      options
    ) => {
      const dirname = path.dirname(containingFile)
      return moduleNames.map((moduleName) => {
        if (
          !(dirname in cachedResolvedModules) ||
          !(moduleName in cachedResolvedModules[dirname])
        ) {
          console.log('RESOLVE module names' + dirname + moduleName)
          cachedResolvedModules[dirname] =
            cachedResolvedModules[dirname] || Object.create(null)
          cachedResolvedModules[dirname][moduleName] =
            typescript.resolveModuleName(
              moduleName,
              containingFile,
              compilationSettings,
              {
                fileExists: typescript.sys.fileExists,
                readFile: (path) => {
                  console.log('READ FILE' + path)
                  return typescript.sys.readFile(path)
                },
                directoryExists: typescript.sys.directoryExists,
                getCurrentDirectory: () => currentDirectory,
                getDirectories: typescript.sys.getDirectories,
              }
            ).resolvedModule
        }
        return cachedResolvedModules[dirname][moduleName]
      })
    },
    // getScriptKind: (fileName) => {
    //   console.log('get script kind' + fileName)
    //   return typescript.ScriptKind.TS
    // },
    directoryExists: (directory) => {
      if (!(directory in cachedDirectoryExists)) {
        if (directory.startsWith(configDirname)) {
          // process only files inside folder
          cachedDirectoryExists[directory] =
            typescript.sys.directoryExists(directory)
          console.log('directory exists' + directory)
        } else {
          cachedDirectoryExists[directory] = false
        }
      }
      return cachedDirectoryExists[directory]
    },
    fileExists: (file) => {
      if (!(file in cachedFileExists)) {
        if (file.startsWith(configDirname)) {
          // process only files inside folder
          cachedFileExists[file] = typescript.sys.fileExists(file)
        } else {
          cachedFileExists[file] = false
        }
        configFilePath
      }
      return cachedFileExists[file]
    },
    getDirectories: (path) => {
      console.log('get directories ' + path)
      return typescript.sys.getDirectories(path)
    },
    readDirectory: (path) => {
      console.log('read directory' + path)
      return typescript.sys.readDirectory(path)
    },
    readFile: (path: string) => {
      if (!(path in cachedReadFile)) {
        console.log('read file' + path)
        cachedReadFile[path] = typescript.sys.readFile(path)
      }
      return cachedReadFile[path]
    },
    realpath: (path) => {
      console.log('realpath')
      return typescript.sys.realpath!(path)
    },
    useCaseSensitiveFileNames: () => caseSensitiveFileNames,
    getNewLine: () => newLine,
    getCompilationSettings: () => compilationSettings,
    getCurrentDirectory: () => currentDirectory,
    getScriptFileNames: () => scriptFileNames,
    getScriptVersion: (fileName) => {
      if (hasFile(fileName)) {
        return getFileVersion(fileName)
      }
      return `0`
    },
    getScriptSnapshot: (fileName) => {
      if (hasFile(fileName)) {
        return typescript.ScriptSnapshot.fromString(getFileContent(fileName))
      }
      if (!(fileName in cachedScriptSnapshots)) {
        const content = typescript.sys.readFile(fileName)
        if (!content) {
          console.log('NOT FOUND ' + fileName)
          return undefined
        }
        cachedScriptSnapshots[fileName] =
          typescript.ScriptSnapshot.fromString(content)
      }
      return cachedScriptSnapshots[fileName]
    },
    getDefaultLibFileName: () => defaultLibFileName,
  }
  let languageService = typescript.createLanguageService(
    languageServiceHost,
    undefined,
    false
  )
  languageService = withIntellicode(
    languageService,
    languageServiceHost,
    intellicodePath
  )
  return languageService
}
