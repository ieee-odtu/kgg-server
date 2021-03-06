import express from 'express';
const router = express.Router();

import User from '../models/user';
import Session from '../models/session';

import {jwtValidate} from '../middleware/jwt';
import {_EUNEXP, _E_CAST, _CREATED, _REMOVED, _FAIL, _SUCC, asyncWrap} from '../util';

router.get('/', jwtValidate('utype', ['admin']), asyncWrap(async (req, res, next) => {
  let users = await User.find({}, {__v: 0, password: 0, _jti: 0})
  if (users.length == 0) {
    return _FAIL(res, 'U_NF');
  } else {
    return _SUCC(res, {
      users: users
    });
  }
}));

router.post('/', jwtValidate('utype', ['admin', 'staff']), asyncWrap(async (req, res, next) => {
  let lookup_email;
  if (req.body.utype == "participant") {
    lookup_email = req.body.user.contact.email;
  } else {
    lookup_email = req.body.user.email;
  }
  let found = await User.findOne({email: lookup_email})
  if (found) {
    return _FAIL(res, 'REG_EMAIL');
  } else {
    if (req.user.position == 'staff' && req.body.utype != 'participant') {
      return _FAIL(res, 'E_UNAUTH');
    }
    req.body.user.position = req.body.utype;
    let ret = await User.createNew(req.body.user)
    return _CREATED(res, 'User', {
      id: ret
    });
  }
}));

router.get('/:uid', jwtValidate('utype', ['admin']), asyncWrap(async (req, res, next) => {
  let found = await User.findById(req.params.uid, {_id: 0, __v: 0, password: 0, _jti: 0})
  if (found) {
    return _SUCC(res, {
      user: found
    });
  } else {
    return _FAIL(res, 'U_NF');
  }
}));

router.delete('/:uid', jwtValidate('utype', ['admin']), asyncWrap(async (req, res, next) => {
  if (! await User.findById(req.params.uid)) {
    return _FAIL(res, 'U_NF');
  }
  await User.remove({_id: req.params.uid})
  return _REMOVED(res, 'User');
}));

router.get('/:uid/sessions', jwtValidate('utype', ['admin', 'staff', 'participant']), asyncWrap(async (req, res, next) => {
  let found = await User.findById(req.params.uid)
  if (found) {
    if (found.sessions.length == 0) {
      return _FAIL(res, 'S_NF');
    } else {
      return _SUCC(res, {
        sessions: found.sessions
      });
    }
  } else {
    return _FAIL(res, 'U_NF');
  }
}));

router.post('/:uid/sessions', jwtValidate('utype', ['admin', 'staff']), asyncWrap(async (req, res, next) => {
  let found_user = await User.findById(req.params.uid)
  if (found_user) {
    let found_session = await Session.findById(req.body.session)
    if (found_session) {
      found_user.sessions.push(found_session._id);
      found_user.save();
      return _SUCC(res);
    } else {
      return _FAIL(res, 'S_NF');
    }
  } else {
    return _FAIL(res, 'U_NF');
  }
}));

router.delete('/:uid/sessions/:sid', jwtValidate('utype', ['admin', 'staff']), asyncWrap(async (req, res, next) => {
  let found_user = await User.findById(req.params.uid)
  if (found_user) {
    let found_sesion = await Session.findById(req.params.sid)
    if (found_session) {
      found_user.sessions.splice(found_user.sessions.indexOf(found_session._id), 1);
      found_user.save();
      return _REMOVED(res, 'Session', {
        id: found_sesion._id
      });
    } else {
      return _FAIL(res, 'S_NF');
    }
  } else {
    return _FAIL(res, 'U_NF');
  }
}));

module.exports = router;
