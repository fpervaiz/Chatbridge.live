import Vue from 'vue'
import Router from 'vue-router'

const HomePage = () => import('./../components/HomePage.vue')
const About = () => import('./../components/About.vue')
const LoginRaven = () => import('./../components/LoginRaven.vue')
const Rules = () => import('./../components/Rules.vue')
// const Login = () => import('./../components/Login.vue')
// const Register = () => import('./../components/Register.vue')
// const ResetPassword = () => import('./../components/ResetPassword.vue')
const Chat = () => import('./../components/Chat.vue')

import store from './../store';

Vue.use(Router)

const routes = [
    { path: '/', component: HomePage },
    { path: '/about', component: About },
    { path: '/raven', component: LoginRaven },
    { path: '/rules', component: Rules },
    // { path: '/login', component: Login },
    // { path: '/register', component: Register },
    // { path: '/resetPassword', component: ResetPassword },    
    { path: '/chat', component: Chat, meta: { requiresAuth: true } },
    { path: '*', component: HomePage },
]

const router = new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(x => x.meta.requiresAuth)
    if (requiresAuth && !store.getters.isUserAuth) {
        next('/raven')
    } else {
        next()
    }
})

export default router