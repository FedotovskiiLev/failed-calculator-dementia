export const BUILD_VERSION = "1.8.0";

export function applyBuildVersion() {
  const title =
    document.querySelector(
      ".titlebar strong"
    );

  const footer =
    document.querySelector(
      ".footer span:first-child"
    );

  if (title) {
    title.textContent =
      title.textContent.replace(
        /dementia build [0-9.]+/,
        `dementia build ${BUILD_VERSION}`
      );
  }

  if (footer) {
    footer.textContent =
      footer.textContent.replace(
        /dementia build [0-9.]+/,
        `dementia build ${BUILD_VERSION}`
      );
  }
}
