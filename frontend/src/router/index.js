import Vue from 'vue'
import Router from 'vue-router'

import HomePage from './../components/HomePage.vue'
import Login from './../components/Login.vue'
import Register from './../components/Register.vue'
import ResetPassword from './../components/ResetPassword.vue'
import Chat from './../components/Chat.vue'

import store from './../store';

Vue.use(Router)

const routes = [
    { path: '/', component: HomePage },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/resetPassword', component: ResetPassword },
    { path: '/chat', component: Chat, meta: { requiresAuth: true } }
]

const router = new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(x => x.meta.requiresAuth)
    if (requiresAuth && !store.getters.isUserAuth) {
        next('/login')
    } else {
        next()
    }
})

export default router