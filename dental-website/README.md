# Dental Clinic Website

A modern, responsive website for a dental clinic built with React and Tailwind CSS.

## Features

- Responsive design that works on all devices
- Modern and clean UI
- Interactive components
- Smooth scrolling navigation
- Contact form
- Services showcase
- Patient testimonials

## Tech Stack

- React 18
- Tailwind CSS
- Vite
- PostCSS
- Autoprefixer

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dental-website
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The website will be available at `http://localhost:3000`.

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
dental-website/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   └── sections/
│   │       ├── Hero.jsx
│   │       ├── Services.jsx
│   │       ├── Testimonials.jsx
│   │       └── Contact.jsx
│   ├── App.jsx
│   ├── index.jsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Customization

### Colors

The color scheme can be customized in the `tailwind.config.js` file under the `theme.extend.colors` section.

### Content

To update the content:
- Services: Edit the `services` array in `src/components/sections/Services.jsx`
- Testimonials: Edit the `testimonials` array in `src/components/sections/Testimonials.jsx`
- Contact information: Edit the content in `src/components/sections/Contact.jsx`

## License

This project is licensed under the MIT License - see the LICENSE file for details. 