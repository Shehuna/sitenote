export const processHtmlForUrls = (html) => {
  if (!html) return html;

  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentNode.nodeName !== "A") {
        textNodes.push(node);
      }
    }

    textNodes.forEach((textNode) => {
      const text = textNode.textContent;
      if (text && text.match(/(https?:\/\/|www\.)/gi)) {
        const span = document.createElement("span");
        span.innerHTML = text.replace(
          /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi,
          (url) => {
            let href = url;
            if (!href.startsWith("http://") && !href.startsWith("https://")) {
              href = "https://" + href;
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="note-url-link" onclick="event.stopPropagation()">${url}</a>`;
          },
        );
        textNode.parentNode.replaceChild(span, textNode);
      }
    });

    return tempDiv.innerHTML;
  } catch (error) {
    console.error("Error processing HTML for URLs:", error);
    return html;
  }
};

export const highlightHtmlContent = (html, highlight) => {
  if (!html || typeof html !== "string") return html;

  try {
    const withUrls = processHtmlForUrls(html);
    if (!highlight) return withUrls;

    const parser = new DOMParser();
    const doc = parser.parseFromString(withUrls, "text/html");
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedHighlight})`, "gi");

    const highlightNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (regex.test(text)) {
          const span = document.createElement("span");
          const parts = text.split(regex);

          parts.forEach((part) => {
            if (regex.test(part)) {
              const mark = document.createElement("mark");
              mark.className = "search-highlight";
              mark.style.cssText =
                "background-color: #ffeb3b; padding: 0 2px; border-radius: 2px; font-weight: bold; color: #000;";
              mark.textContent = part;
              span.appendChild(mark);
            } else {
              span.appendChild(document.createTextNode(part));
            }
          });

          node.parentNode.replaceChild(span, node);
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.nodeName !== "SCRIPT" &&
        node.nodeName !== "STYLE" &&
        !node.classList.contains("search-highlight") &&
        node.nodeName !== "A"
      ) {
        Array.from(node.childNodes).forEach((child) => highlightNode(child));
      }
    };

    highlightNode(doc.body);
    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error highlighting HTML:", error);
    return html;
  }
};