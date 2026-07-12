const { beforeUserCreated, beforeUserSignedIn } = require("firebase-functions/v2/identity");

// Supabase requires custom claims to identify users via RLS.
// These blocking functions run synchronously *before* the user's JWT is minted.
// They inject a custom claim `role: 'authenticated'` into the token.
// The Supabase SQL policy `auth.role() = 'authenticated'` then passes.

exports.beforeusercreated = beforeUserCreated((event) => {
  return {
    customClaims: {
      role: 'authenticated'
    }
  };
});

exports.beforeusersignedin = beforeUserSignedIn((event) => {
  return {
    customClaims: {
      role: 'authenticated'
    }
  };
});
