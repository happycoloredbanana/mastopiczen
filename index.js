import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap-theme.css';
import './index.html';
import './index.css';

import React from 'react';
import { render } from 'react-dom';
import {
  App,
  Grid
} from './modules/App';

render(
  (
    <App />
  ),
  document.getElementById('app')
);
