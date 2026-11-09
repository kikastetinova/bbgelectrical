/* Style guide entry: loads the site's existing stylesheets unchanged.
 * It deliberately does NOT run src/main.js, so the JS-driven states
 * (.is-scrolled, .menu-open, .is-open, .is-visible) can be shown
 * statically by adding those classes in styleguide.html. */
import "./tailwind.css";
import "./styles/main.scss";
