import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap-theme.css';

import React from 'react';
import { render } from 'react-dom';
import App from './modules/App';

import './index.html';
import './index.css';

render(
  (
    <App />
  ),
  document.getElementById('app'),
);
