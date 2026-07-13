export function getTheme() {
  const storedTheme = localStorage.getItem("theme")
  const savedTheme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "auto" ? storedTheme : "auto"

  if (storedTheme !== null && storedTheme !== savedTheme) {
    localStorage.setItem("theme", savedTheme)
  }

  if (savedTheme === "auto") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    return mediaQuery.matches ? "dark" : "light"
  }
  return savedTheme
}

const setThemeAndStatusBar = (theme: string) => {
  document.documentElement.dataset.theme = theme
}

export const initializeTheme = () => {
  const savedTheme = getTheme()
  setThemeAndStatusBar(savedTheme)
}

export function watchThemeChange() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  mediaQuery.addEventListener("change", () => {
    setThemeAndStatusBar(getTheme())
  })
}
