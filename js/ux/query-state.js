import {
  copyText,
  el,
  featureToast,
  t
} from "../ui-utils.js";

let lastOriginal = null;

function pageUrl(source) {
  const url =
    new URL(location.href);

  url.searchParams.set(
    "q",
    source
  );

  return url;
}

export function queryFromUrl(
  url = new URL(location.href)
) {
  return url.searchParams.get(
    "q"
  );
}

export function initQueryState() {
  const input =
    document.getElementById(
      "expression"
    );

  const calculate =
    document.getElementById(
      "calculate"
    );

  if (!input || !calculate) return;

  document.addEventListener(
    "failed-calculator:interpreted",
    event => {
      lastOriginal =
        String(
          event.detail?.original ||
          ""
        ).trim() || null;
    }
  );

  document.addEventListener(
    "failed-calculator:run-end",
    event => {
      const source =
        lastOriginal ||
        String(
          event.detail?.source ||
          ""
        ).trim();

      lastOriginal = null;

      if (!source) return;

      const url =
        pageUrl(source);

      history.replaceState(
        null,
        "",
        url
      );
    }
  );

  const share = el("button", {
    className:
      "workspace-tool-button",
    type:"button"
  });

  const localize = () => {
    share.textContent =
      t(
        "ССЫЛКА",
        "SHARE"
      );
  };

  share.addEventListener(
    "click",
    async () => {
      const source =
        input.value.trim() ||
        queryFromUrl();

      if (!source) return;

      const url =
        pageUrl(source);

      const ok =
        await copyText(
          url.toString()
        );

      featureToast(
        ok
          ? t(
              "Ссылка на запрос скопирована",
              "Query link copied"
            )
          : t(
              "Не удалось скопировать ссылку",
              "Could not copy link"
            )
      );
    }
  );

  document
    .querySelector(
      ".workspace-top-tools"
    )
    ?.appendChild(share);

  new MutationObserver(
    localize
  ).observe(
    document.documentElement,
    {
      attributes:true,
      attributeFilter:["lang"]
    }
  );

  localize();

  const initial =
    queryFromUrl();

  if (initial) {
    input.value = initial;

    input.dispatchEvent(
      new Event(
        "input",
        { bubbles:true }
      )
    );

    requestAnimationFrame(
      () => {
        if (!calculate.disabled) {
          calculate.click();
        }
      }
    );
  }
}
