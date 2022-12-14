/// <reference path="../typings.d.ts" />
import * as path from 'path';
import * as HttpStatus from 'http-status-codes';

import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as ejs from 'ejs';
import * as express from 'express';
import * as cors from 'cors';
import * as helmet from 'helmet';

import { Router, Request, Response, NextFunction } from 'express';

// Import routing
import adminRoute from './routes/admin/index';
import memberRoute from './routes/member/index';
import indexRoute from './routes/index';

// Utilities
import { Database } from './utils/database';
import { JwtModel } from './utils/jwt';

// configure environment
require('dotenv').config({ path: path.join(__dirname, '../config') });

const app: express.Application = express();

//view engine setup
app.set('views', path.join(__dirname, '../views'));
app.engine('.ejs', ejs.renderFile);
app.set('view engine', 'ejs');

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.use(helmet());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }))

app.use(cors());

const api = express.Router();
const admin = express.Router();
const member = express.Router();

// Database connection
const db = new Database();

app.use((req: Request, res: Response, next: NextFunction) => {
  req.db = process.env.DB_CLIENT === 'mysql' ? db.getMySQLConnection() : db.getPostgreSQLConnection();
  next();
});

// JWT
const jwtModel = new JwtModel();

const auth = async (req: Request, res: Response, next: NextFunction) => {
  var token: any = null;

  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else {
    token = req.body.token;
  }

  try {
    var decoded = jwtModel.verify(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.send({
      ok: false,
      error: HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED),
      code: HttpStatus.UNAUTHORIZED
    });
  }
}

// Routes
// default route
app.use('/', indexRoute);

// api prefix
app.use('/api', api);
api.use('/', indexRoute);

// admin route
api.use('/admin', admin);
admin.use('/', adminRoute);

// member route
api.use('/member', member);
member.use('/', memberRoute);
//error handlers
if (process.env.NODE_ENV === 'development') {
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.log(err.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      error: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
    });
  });
}

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(HttpStatus.NOT_FOUND).json({
    ok: false,
    code: HttpStatus.NOT_FOUND,
    error: HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
  });
});

export default app;
