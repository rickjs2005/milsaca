// Metro config — Expo + NativeWind + pnpm workspace
//
// Setup monorepo (https://docs.expo.dev/guides/monorepos/) ajustado pra pnpm:
// o symlink em apps/mobile/node_modules aponta pra .pnpm/<hash>/, então
// `extraNodeModules` via Proxy força qualquer require a sair do projectRoot
// — evita Metro confundir versões duplicadas no workspaceRoot.

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch o workspace inteiro pra HMR pegar mudanças em packages/*
config.watchFolders = [workspaceRoot];

// Resolve sempre primeiro de apps/mobile/node_modules, fallback no root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm cria uma árvore plana de symlinks em <app>/node_modules apontando
// pra .pnpm/<hash>/node_modules/. Sem este Proxy, Metro às vezes resolve
// requires (ex. `expo-router/entry`) relativo ao workspaceRoot — onde o
// pacote real não existe diretamente — em vez do projectRoot. O Proxy
// devolve sempre o caminho dentro de apps/mobile/node_modules pra
// qualquer pacote, deixando o resolver natural seguir o symlink dali.
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) =>
      path.join(projectRoot, "node_modules", String(name)),
  },
);

// @supabase/realtime-js usa `require('ws')` que só roda em Node;
// em RN o WebSocket global cobre. Stub pra Metro não tentar resolver.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "ws") {
    return { type: "empty" };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
