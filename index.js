/* ============================================================================
 * Shark Image ST — порт плагина «Shark Image 1.7.0» (Akula, TavoAI)
 * для SillyTavern. Тот же смысл: маркер [SCENE: RATIO | PROMPT], авто-промпт
 * через LLM (inline-инъекция или свой API-писатель), NovelAI / Naistera /
 * прокси, внешности персонажей (мемо), варианты картинок.
 * ==========================================================================*/
(function () {
    'use strict';

    const KEY = 'sharky4';
    const SHK_CSS = '.shk-always{border:1px solid rgba(128,128,128,.25);border-radius:8px;margin:6px 0}.shk-always-head{padding:6px 10px;background:rgba(128,128,128,.12);border-bottom:1px solid rgba(128,128,128,.25)}.shk-always-body{padding:8px}';
    const VER = '4.0.0';
    // Оригинальная акула и SVG-значки из Shark Image 1.7.0 (Akula)
    const SHARK_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAMAAAC8EZcfAAABgFBMVEVdX1zZ2torUWAgn99dJRtcaGCenqS529uazt4YKC69vcY7Ozt+f4Db3dwLLkB8gYL/Vizp6us1QT8AVVUUcqEdhroA/wBmmZlwrsanMheff5+en6DJKg7/f3//v//Dw7sAAAD59OQBAQEwpuEwpN7////7Phrx7Nz18N40se+4trASFhcqmdD9QRyJiYf8/PzX1tA2NzWWlpNWVlS7vLsoJyZ3d3NISUfo6eb6+voMJzMnhrQQN0oaWHVnaGWpqafKysjm5uf29fYHGyUdZommo5qpqarIxbnV1tbn5+cke6YVSmTS5OIUQlmt1+Hq6uqMyuEicprJycv9RyHZ2tqYmZhjYlwsAgAgZ4pUtODh3dB8fX0hHBlovOCFhHzIyclNCgHx8vLTNxhDQT2sKhFWFQlVs96MGwaWJA/BvrJDreC8w8Tl5eXq6+tuFgeKioqZ0OSgnpa7u7spjsJdY2V0wuIZX4BZWVlGrd5jud7X19cecJohIB54wd+AfnbS3uAMBm9JAAAAgHRSTlP+VP///wYTE//9HAT+iP///8r/A///AQX//wj//wIEIgD+/v//Av/////+/v///tH+/f7+Ff3+/f6x/v////3+/lWQ////Df8ybP//////jP//Kv9JDP7/////Bf7//xX/eP////////////44qf8L//8j//7//wf//xL//////5E8phgAABWSSURBVHja7VwHe9tGk2ac4tSvXO+HXQAECYAEe28iKbGpyyqWi1zibid2HKeXv34zu4sONhnfXZ7nvJYtkiYWL6bP7OwmpD/4SLwD+A7gO4DvAL4D+P8BoBoYfyCA0YBihJl4S3DiZWn8/PkGG8+fj0ufhf7//wCgWmI3/3q80a9bFvENy6r3N54fC5D/KwADPOOvj6/drTNAOb3w506xykax83lBz7GPAeUWfvm/1L8lQB8y/pq9L20guJr+ebVMI0a5WtFrCHJyKIkrvFOtLqOJZejEq61Sacv+TJJuMHR6R2BrtGbt4cG0CWN6MGzPWg2Do+x0GcZStDyq6pb6VgD5lK6QMdECmBd34W23iCCMVvugacpyGobMB3tlvp62WwxltQCE7I+ZvD6f4FQ46vW7GxfsHjcuDRCf7uuNPkKr9fQCDC5a9T1Ceh28eeusqciISwkNBCorzWELMRZ1uGqDEZ3Ucj1d13tsJovhVv/zUgCReuM+zNLLVg2PaHXgZnqVoTMRnIMnMPinadk8QIzlLALSK3l3qnIRSWtx9q8NEC/BJ+aUMvLFSrZQyFaKZfYO/rYRXTS0IEjZHDbgisoJwrp5v9ipVConXLPy2XPOfnVNgPBUY4BXKDMZGmmuhTvvJuCzTxSGTl5lsK81G/hkJ5s5dypNv30fpweO9EsLiJiIJN8FMDcLxLv/is2YSmlspJjRqxi01ZRXg8cgykobqLXJp/LMRHJZIEEeIE4YUVYECGo6AeoBvJMRmzHldRIpuE2uSOk0rYi7B8CEXiuy2aA3N9lz+vwNmxjluZoj1uE8IoYAqtJWneTgsmIuNKWYGOADwgA2xf/SkU/AN6BFjV0WNRXRQaZBhzbmWJxECN/Ywvsj4bUoeHzeTUoDXFZsjH5jw/BVouFxljBu5XNkL1pXEkF8G4QAB2+zK+cORDhQIuUwaA7lBuCLmCuVEuyBX8iwLqmXpK0lAEEMJiRXpuWRgw8FOoLRGqnQnXQUkxUfCZV0mxajWWvTj73LIputiwiECT++PaIbKDGaf54oFuVppCoHPIpJDS1IQI0FQN0u80wpPjPctoMI1YUAAV+X2hLDZh0VKicnlVc5Er6JTlto5BTH2HmE0VYTRW7RzfDDnVfy3J3k0THh1BoyrkisUghhIoQv6xB/1HEiKbSnqSgSKov9SJPmwwwueHwn2EcXYYfUj4PWJuHBNwGq0AJ7YE14XHckan6EqCft9AJ/ggBBAsMEPAmEjmgwcL7zMjDvhTQPoCpdIz2kH8enBaeh+eCNNDqQ5YUUlBXD0IJWxTdxnrn3Cn4ONDSAPJOAT0k4+C7wCxXiyCz4927HO1k1yKoqNRd6PORw0U/AFFpQ/5RZxHnOEAIDe2Tsp6ED8EMLhKoo2HgboziM2H3hfMF3Mw2mPlgMMILD2i/eGZm8dzGQ6LEZC7RMrK99Ypiw45cJWDZboJFw3Hr5AJYDxNBp2+98FZ/tZjqc80luCp2UZ/CbZDnCFPwpgqLs+ZicEAHCGOkrZkMpKXNO+8Ww69eTHBqaCAPoRjFBEUwRv+bRHvsYtfrmOVNmg+rkUN0KAlQlC4jFWJgCStrEJ3n/dBU/vzTacOwM4uKJiQegCTwJRDBGIPmrcWFGORSmoUzqXilM2B44CxKbcqUYVb8WeFz+Dc/dbg4EHEQHkXO73Z6aDkQEGLgCiB4YBtyo9gl7+RvRGIkLPj1JMBf3NakhuXGyHH/GDghvKOHNRwFkgpdWMK5nozXFbMBRYj/AUTiD5pYGx4h/w/CRMCFMdMLmX9EmfkQ+HgBYEwAVgAePNZgNz9qYIjUOZO4Em/RkOUCvynA98ZGQAdyyctQ4F5q5YARZbDR4avLzQBAOxFD5GUjZmGLSEkHB3KLpUWVS5IlfChNcAjs2AfOLJuj4leSc/glhmEC1HdNOQYG3U4A4MyNlMKgkQSVMMQg9siXd8AK0amhilrLAb6lT8GUMCZtAsGbaq7yyfDCgrXSUFpP7i+bPC2vdwQTAAahKh/AZc0kaNzFzx7n3dhq4gGFaSU+NNuiI32CnlfaQ2cGbtUCQ9tvCG+Q4Y7xqggDvAlV1fu/8YiHWAkE1y+2UcNAlKiIQ7ufW0RLwBBoziz3yb5IHYL1Gf9FWEJEngZvdF8GCEpHaIWYlPbMf3BthLJEh9PEV0GPhTRKqVGJc11ayAiFHsjBjTx8Enc+SWxSYrR6BME5sHidKoMNFCDpSy642ciQYOLXTiwGClnwQeKpUKF4NayHwkfQdgKrUB2edW/54m8HIruhmTdff7O/ubrOx+3L/+g9OUaFBc6GM7ub8eziaUKt7AIIIlh3LtsBGaREBNYynb3a3gyC2X/7IhbMdCCK5dZrLJM1+9J51LDkArZ5rT+dq8Ukos83SM9mU3+zOye23X16XedKUiihLLJJyNA9dcixImJC+B3smdCQ110xVQgBqv4AOf7y9oPxAdh+aELKG9Dg1F+FIALwNdN9yAG6BEjv8m2NnCuGKSoHOXtbIkvHx9X8IeTtE8OSXaE+aspmTJd84AC+Y3bFLCa+iPNAoXFyBJ3lGlo/UfiNMQjR2xahQxJWeAvlvB+BVD0CRL/klNxsufKCY3J5fsfJSuhuVusOV3XxIAMWDIItfBVjsDVM2fVwu39bCNQXUxDKJrFiFERZDiiwKF5vVcIGBA+wA1V0lkSAG9DgJIP9t++F46SSCULWyn3F+YP53OSPkkO26Vq5wki8bRvl+xVtZwWfKWZLHzOR8XOC1p83NzSe56LIWC7sr3gnZ93Ijvbupj0Sd3AGJ4VM+usiYEvU9LXifMiU+Qw2eJBBI+ecICdBtet+HbpQtehKEcrEwcoHDr4StnyEqauJptEA6W/a5uglEGN2gy0yl5td/X2EKb5ceyROsgZWL2W6vQB80el0GtmzX1YT5z66iUa6Z7JBrHoAYr56sPAE6AqNnVxBrbC2lI3B8dcQtZo1VM7KOemnlSEWZN4og4B85AHnEb2hrPB9YfIEva9CqXn5gMJNYOc1kvuTBQfHBzQLoaEVwkPSMqDrmnAEJnMthBnACmFeyagwTNZ6I73YNXKvonh49xnysR+8lk0d30NxeOT26UyG9ou2CNDLCytrCurzLoQ4IxDUfwC0Era1wuYZ1JWMk8HVoFUsrjcdHR48hWAQGJ2GAOFeBlPeQlL0qrWp2wXjhYoTPxBo16zNv2omVrU4oXo4kXy5PG88Efyt0gOws0EwmefRVHhiczCSTmcfl4ukRvLzzLVcPO0L5lwGCXYGGqFHv+fNitWTVjKVinGILTLM3duBz5fQD+mcg4COAlcw8oPcQHvzcofgr+R+0RrqNBw/y9tVPW9ToLiOixoqA4dIHK751F1yMiwWj+9Q4SNecQtrpX+6d5junjLHAU/YrmeTvUBq/7dDHR3f+zqbarnzG19cWQixgavGTqgarWxOkzua8i5lz6bD6wa5Dzw7wNvOIfmmDSiadFxmGmN5JZo5OE86cD9mqLBqfOWtsfEFH92iIpz74AhFWolwbs9i9DtYPZPmh19zcy2SOjpLhkck4f+9BXGLPmDNZycG4fR7lo5BHGITpZE8Kl4BVRAhWo9zlDi4lvIlwl5v3RclK3vXmJI+SkYNBy6DKIIXP3St+xDJdG9d5dbF2nGIeK8XXjzWwquUe+SKyiM5WwbBgmS8E0rBcociLfpiL3/IZ/NNMci7EJMN35KtGbPNlKKwk3ux0z/3x0ahiMBZOAgslCXed7j2LL97kKxiU5CA6eVWpYo7YuGKm06xytetV6icof5kQMA+jM4+pLxj/UeG12ObMYEFFpaA/GY1G+uZvrMelkyPWWFqw0lTq44K/v3A54N0dvDp+PRiKutSyZc+VQQQf8PG7iqiPAEZW6vQG/IUasSbfh1oDfGt10sWehe1O2Y5BWzsz1rMj6uKsPrQbdJpfHTFQfnzJ5D3+8uhO0MVfdws3wBOzedaezVq0nO3mWIfS19KS1U743+/H/TpbGGA1e16VtMtCT2uhuOYxI5ZrbBjQx/QDpilf0ScBo7DvrIyK5h8YTcyWLG+P14IVd/6FGxDeDGQl2LOj7Id8SwWQHYG5/vZOxpXAzGmlSB8dAb5QBCPUxMGI9W0TwtM9T8Pfsp4FbAKzerQhlj281aGILB2cxb+C7vVOUeQEp5MQJ3TzDx7YFSk/j12AIIlwA7PNo6t5nTNRjT03LHB8xs7wbDgbehBej7L+t9FFktrNexlHRb40arhGZegRfmn/fRugIjdbOzutASpIrS+t0dijSseQzIrc015Kwn/2I/2TXjYg0qs+OnIAfpDAOMvpKwjw2K54Kukhv0MbAFrrAdwCgDOlOfxuiOtGrMaL/2xH+08NQsRs8cFfjjLcf0DMWmUuKdKvP/SUZJvTKZqJAf29vh7AT8Evt9mih7MqiDo8N4g9r4A5v/PVoy9hPLpzSul9fW70/KvpaUniktjALHgtgIcQVLTTrpJwgG8WxNmYeOYNw6BG40pnUyPzo/uPTcVXaJfNIS7gzG+AiwZYARey0263dw7cKvnuwlRApOCaE5nMKxt6WpJarVaDKUnPWg/gGAAKJZm5VejtxaGwFkjG542nYvmRrQAxJTEux2K5eTAcNl0j+JTEM350l8zMZtNkSpJbU0m+EUriW/i4FRNAEEIB0LbW65sZXDhpmQqPE2yU+zEB3DV9/tNs7lBK1qTgR6wRY9CCSKPptN3txgTwd0dJ5J0G1xFvIWElV/c96QE8JsJDR0m2YwJYE4v08INr9IPZGQsW1gCIHSBoB83XzabphjK1uAD+wNHhHxN1REYtvqGuY2b6pEyb/m425QcS13gY6K5Jz3y1mOU9rOqHGG05jToimL4eG8Bbro6IqGYhjxPRdtqzTMhk2rwVG8BfzeDKLfL4n6XVAXIOB9Yx92MDuO+3M4LH46j+1TkArVxEA228AP2LtlOaJ3elFSNqDLayrgu2p3o/ToCyYwm5HJrUs/y6HOAGqfIubt9q/268LLZtIRfxFqQNJUldESCuSphysHs2PoC7ptvKLIRwyMr6pRUBggg6vQhuw12sAL0Ty6IVd281Ct4AR1wQRkaxG06UuCnIommbzVwIibUawJJ0jRTpQVo8GuTVwxbrPYkPIMZb8uu26e2IbEDU/2E0wlAv/8TTYg4P+h2lMQNkZuaAGs20C3BGC84Ktr/KEQaIPSCujdmhxmsk5/svYzbUkCq1HVGEdxVfV6Nqb8SLAFgnopsDyybYaRe/HRSbEOifzDSXQiCoZ3VOkO64FE3B+jZXYvg5o/Tbsmh/2o81WFCwYQWe/kx01E9p0W54Y/AO79YtQqy7JVVNRFgZ3EQA5GvhSlZVCOSteKMZNM5612CFedEJiQDVEkOHe/l63UIPbU+YgjWkYBrJl88RCGx4/Si+cOshNy+Qy5FagtJWMy2np5zFSDzcLVcr5EUj0nGkDBqyfNBgncpfQHbC97XEBrD2VOFdXWViWeQZINlpci3GnZATIN6/I7rBzsEOIChFmZkqbTVYp3x9LNwKIowr5N+2o9Qq2fhwj3d/GCzzlG4AvBoW+xttzCmxZvOZGvIk35DcJwCvR6wJ4O0LxywrcSVNu0xv09ywSIfAUL1olLvkPWnDItvYpD9rMhP3HcjlJCSDfNcVlrQnx5L6kx3aKPL7cVnqfR4fYMvUsXohNpASsjcG6gE8Y2jyXY8mxtlhLUaEz/tWfeMYX/E60ndorcy47Mwt7uUHPAREvdja6N99b4+t0wl4+AQ7QGJU7KiszjGXWGwVW5diszPXmRK/dho7mOpes1jfe1tJ263tU9rg8UMiamOxql5VPUrNYsOntbh0hLuObx3LLF3USa2Irddpx/cBhbvkULq6dAs56xDmpjoeLWGlGR4dsO4sIOA1thVS9GLzcjPbjccjxMUAt1gOyusf8Qjhr5xCA/o7YyD87DHytUWWzH1zkxo18pG6HCAW1HWxrSUeU/2DiFDLbP+XKpXqRC8j+RR3SyNnsAgelhxj4KYo8fD4d24Fz7hrK0mHFirvzF4OFItPM8bgkrQSQGyq4ZXqOELCfXu/YpdsgZkds/1TB2meRtn4ptiYchwdsIYWnaQLdMex8fgH0V6N3foS4qvShullLzfRnr6FZSdVsPDGiIvHu1xNp2yBsz8htTz9RPFvqEXyVjw53lKA6sRJ5N9ej28pIlGnH2R7rImn5W7odvb75on1oboyQPB2XbY5JIaIZtspdbBTAzp5EB47s7UL61NsnDn0bxlaqsc0prj/VzuS2UmbP+9AXLXj7CBzCDgEAv7Vs7K9wmkp10DTzuIg4bbIQBogMqxv4Sy4wQOHXwRXoeAxYRXXtyfhG1m4iYEoi6Yjd1Bgh/a1lZWE74vO496bt1XkbaeWNfScdBDczYObUCAbcDZCrwJQqMnbJnfXHT/rsyphhDtsB+rKAJmaOEXhywfWL8UmwZa9zCa7q3ay59gL5op1p4VwBYBb6hjiIXFowaVzk23RrDDFFc7Z2bRp4iqJKPTL3r1bivwzMvnvVwYIw3rmALykw6s9dHa9590u/h23VmiH0uyfFv3cbuJaAeA/sS4LUbZWlFusPY43ruExKil3sDdayvOReMl7FRgE3KNDcnoWT5liSbGSDh5vwTMmiCbUVWUQuyzaaUXc49alfJyopqYR4F/tc7owERnglt+0/2QiMNd2SrAWQI7Q/FFfdzw0PYsiOpGk7z8dP9+Y9DEp5svuB3xdMC0G1lz7qwOULJ2VhUXO8B1dd/yj2+nRoj3LcWSHmBTbp2MZeDpW+8rwSnvWMpw12hWVRGcyyAXkNaXZtUbH3QuPfg7X19Ub4miwLX6YVC/byXu3sxnFnPAmKwLsMUvNRBgMWXZNCcy7686Kd1MfjwmOx6waSNiZV890/Vkvhz5/dS3m3f4NOyBvQ7T54pvDq6XVxmHpELc927tAMV26Gy72SlfHk36/Lo4NwwPISqsbaqcmp/BFF8gIL9Y6Xw57oBvCGGMt9T3/ms2cY+BWd3Wi9M8WiCChYQnDhbrGkF5A4tViFoBZmYhVL//Rj/CitHo0w88pqeDiCcPXJV/MPYMqOvFSP8VjOnjwPFjYg3LJ8wexDwTS97SMHXWFRR0Q8+sTkB5B+paeenfmxndAIk/fm+YO0u+FtPahjMgC3PncnmKc8s3fAuCYnyKSZ4X39Q9k5IdlGWyT6JoMSKx4gz4p5KtdgmHaZQ6MLEk/4WFyFd0TK8cKUN16gZa0fihd8jzLLUm6hj5jr7TmDImVvznewNMbL33eJtLt+Kcba8+QWGN+SXqrM0tV9TIzJNaYf+l5lStMsfY1CekPPt4BfAfwHcB3AN8B/IOP/wGZGFBLT+VPsAAAAABJRU5ErkJggg==";
    const ICONS4 = {"img": "<path d=\"M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z\"/><circle cx=\"9\" cy=\"9.5\" r=\"1.6\"/><path d=\"m5 17 4.5-4.5 3 3L15 13l4 4\"/>", "redo": "<path d=\"M20 11a8 8 0 1 0-2.3 5.7\"/><path d=\"M20 5v6h-6\"/>", "edit": "<path d=\"M4 20h4L19 9l-4-4L4 16z\"/><path d=\"m13.5 6.5 4 4\"/>", "down": "<path d=\"M12 4v11\"/><path d=\"m7 10 5 5 5-5\"/><path d=\"M5 20h14\"/>", "trash": "<path d=\"M5 7h14\"/><path d=\"M10 7V5h4v2\"/><path d=\"M7 7l1 13h8l1-13\"/>", "left": "<path d=\"m14 6-6 6 6 6\"/>", "right": "<path d=\"m10 6 6 6-6 6\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5\"/><path d=\"M12 8h.01\"/>", "gear": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7\"/>", "close": "<path d=\"m6 6 12 12M18 6 6 18\"/>", "auto": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 3.5v17A8.5 8.5 0 0 0 12 3.5z\" fill=\"currentColor\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>", "check": "<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>", "grid": "<rect x=\"4\" y=\"4\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"4\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"4\" y=\"13.5\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"13.5\" width=\"6.5\" height=\"6.5\" rx=\"1.5\"/>", "user": "<circle cx=\"12\" cy=\"8.5\" r=\"3.5\"/><path d=\"M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5\"/>", "book": "<path d=\"M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5z\"/><path d=\"M5 17.5A2.5 2.5 0 0 1 7.5 15H17\"/><path d=\"M19 7v13\"/>", "key": "<circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"m11 12 8-8M16 7l2 2M14 9l2 2\"/>", "spark": "<path d=\"M12 3.5 13.8 10 20.5 12l-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2z\"/>", "wand": "<path d=\"m4 20 11-11\"/><path d=\"m14 6 1-3 1 3 3 1-3 1-1 3-1-3-3-1z\"/>", "tg": "<path d=\"M21 4.5 2.8 11.6c-.7.3-.7 1.3.1 1.5l4.6 1.4 1.8 5.6c.2.7 1.1.9 1.6.3l2.6-2.7 4.6 3.4c.6.4 1.4.1 1.6-.6L22.2 5.7c.2-.8-.5-1.5-1.2-1.2z\"/><path d=\"m7.5 14.5 10-7-7.4 8.6\"/>", "photo": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"2.5\"/><circle cx=\"12\" cy=\"12\" r=\"3.5\"/><path d=\"M8 5l1.5-2h5L16 5\"/>", "folder": "<path d=\"M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z\"/>", "globe": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12h17\"/><path d=\"M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5z\"/>", "palette": "<path d=\"M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h2.2a3.7 3.7 0 0 0 3.7-3.7c0-4-3.8-7.4-8.5-7.4z\"/><circle cx=\"7.6\" cy=\"11.2\" r=\"1.1\"/><circle cx=\"10.2\" cy=\"7.6\" r=\"1.1\"/><circle cx=\"14.6\" cy=\"7.6\" r=\"1.1\"/>"};
    const icon4 = (name) => '<svg class="sci-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS4[name] || '') + '</svg>';
    const I18N4 = {"Не добавлять — инструкция уже в моём пресете": "Don't add — the instruction is already in my preset", "Стандартный текст шаблона восстановлен ✓": "Default template text restored ✓", "ru": "en", "Вернуть кнопку на место": "Reset button position", "Где взять стили?": "Where to get styles?", "Шаблонов нет — добавьте в Пресетах.": "No templates — add one in Presets.", "Взято с первой картинки — проверьте и поправьте при необходимости.": "Taken from the first picture — check it and fix it if needed.", "Как зовут в сцене": "Names in the scene", "Шаблон промпта": "Prompt template", "Картинка уже рисуется": "Already drawing", "Вернуть": "Restore", "не расшифровываются — введите заново": "cannot be decrypted — enter again", "Сервер не ответил вовремя": "The server did not respond in time", "Ваш воркер, который принимает запрос и возвращает картинку.": "Your worker that takes the request and returns a picture.", "Изменить": "Edit", "Повторить": "Retry", "Проверка плагина": "Plugin check", "Укажите модель": "Set a model", "Сообщения чата": "Chat messages", "Токен — из Telegram-бота Naistera. Размер и шаги сервис выбирает сам по соотношению сторон. Токен уходит только на naistera.org.": "Get the token from the Naistera Telegram bot. The service picks size and steps from the aspect ratio. The token goes only to naistera.org.", "Стандарт V4": "Standard V4", "Лёгкие": "Light", "Девушка": "Girl", "NovelAI напрямую или через прокси": "NovelAI direct or via proxy", "Отмена": "Cancel", "Список недоступен — впишите модель вручную": "List unavailable — type the model manually", "Назад": "Back", "Без своего негатива": "No custom negative", "Второстепенные персонажи этого чата. Их внешность тоже привязывается к нужному блоку сцены.": "Side characters of this chat. Their looks are also bound to the right scene block.", "Сцена не найдена": "Scene not found", "Укажите адрес прокси в панели": "Set the proxy URL in the panel", "Показать ввод": "Show input", "Размер": "Size", "Токен работает ✓ Подписка: {tier} · Anlas: {anlas}": "Token works ✓ Plan: {tier} · Anlas: {anlas}", "Например: OpenRouter": "For example: OpenRouter", "Модель вернула пустой ответ": "The model returned an empty reply", "Сэмплер": "Sampler", "Сервер вернул не картинку": "The server did not return a picture", "Негативные теги": "Negative tags", "Промпт сцены (блоки персонажей через « | »)": "Scene prompt (character blocks separated by \" | \")", "Переменные чата": "Chat variables", "Прервано — нарисовать снова": "Interrupted — draw again", "Устройство не умеет распаковывать ответ NovelAI — обновите систему": "This device cannot unpack the NovelAI response — update the OS", "Дублировать": "Duplicate", "В галерею": "To gallery", "Не удалось добавить картинку": "Could not add the picture", "Сохранённые ключи не удалось расшифровать — введите их заново": "Saved keys could not be decrypted — please enter them again", "Откройте чат с персонажем — здесь появятся он и ваша персона.": "Open a chat with a character — it and your persona will appear here.", "Отправляю": "Sending", "Нет шаблона промпта — откройте Пресеты": "No prompt template — open Presets", "Обычный": "Normal", "Не удалось сохранить": "Could not save", "Введите ключ": "Enter a key", "Рисую сцену…": "Drawing the scene…", "Слишком много запросов (429) — подождите немного": "Too many requests (429) — wait a bit", "V4.5: до 6 персонажей, лимит промпта ~512 токенов.": "V4.5: up to 6 characters, prompt limit ~512 tokens.", "МБ": "MB", "Удалить вариант": "Delete variant", "Картинка-пример": "Example picture", "например, gpt-4o-mini": "e.g. gpt-4o-mini", "Например: без текста": "For example: no text", "Негатив персонажа": "Character negative", "Расписание шума": "Noise schedule", "Сделать активным": "Make active", "Открыть пресеты": "Open presets", "Чётче детали, чуть медленнее.": "Sharper details, a bit slower.", "Нет картинки": "No picture", "NPC": "NPCs", "Шаги": "Steps", "Ваша персона": "Your persona", "Адрес API (api base url)": "API base URL", "матовое стекло — чат просвечивает": "frosted glass, the chat shows through", "Рисует сцены прямо в чате Tavo: NovelAI V5 / V4.5 (свой токен или прокси) и Naistera (токен из Telegram-бота, NovelAI V4.5 / V5).\n\n**Возможности**\n- Режимы: авто для новых ответов, вручную (кнопка под ответом) или выкл. Готовые картинки не перерисовываются при входе в чат и не тратят генерации повторно.\n- Промпт сцены пишет модель чата (прямо в ответе или отдельным запросом) или ваше API: OpenAI-совместимое, Gemini, Claude.\n- Шаблоны: обычная сцена, манга / манхва, комикс Marvel, чиби, Naistera V4 и свои.\n- Внешность героев держится от картинки к картинке: теги внешности и одежды персонажа, персоны и NPC (вручную, из карточки, из чата или с первой картинки); цвет волос, глаз и кожи не «плывёт».\n- Настройки NovelAI как в оригинале: модель, размер, теги качества, UC-пресет, сэмплер, расписание шума, шаги, точность следования — с пояснениями.\n- Пресеты для каждой модели отдельно — NovelAI V5 и Naistera V4 (переключатель «V5 | V4»): свои стили с картинкой-примером, негативы и промпты, ничего не смешивается. Компактные плитки с быстрыми кнопками: скопировать, дублировать, копия для другой модели.\n- Галерея чата: просмотр, сохранение в галерею телефона или в «Файлы», удаление.\n- Русский и английский интерфейс (кнопка RU / EN в шапке панели). Темы: «Альбом для рисования», «Ночной скетч», «Бимбо · корейский пикми», «Стекло» и «как в Tavo» — только цвета, ничего лишнего. Картинка в чате — просто картинка: кнопки полоской поверх, стрелки для вариантов, под ней мелко название стиля. Панель и карточки не ломают оформление Tavo.\n\n**Стили, промпты и негативы** — готовые наборы в Telegram-группе [@tavvvvoooosty](https://t.me/tavvvvoooosty).\n\nВсе настройки — в панели Shark Image: акулья кнопка на экране чата или «Панель картинок» в правом меню чата. Нужен включённый расширенный рендеринг.\n\n**Безопасность и конфиденциальность**\n- Токены NovelAI и Naistera и ключи API хранятся только на вашем устройстве в зашифрованном виде и отправляются только в выбранный вами сервис.\n- Плагин не собирает статистику и ничего не отправляет автору.\n- Плагин неофициальный и не связан с NovelAI, Naistera и Tavo. Автор не претендует на авторские права на ваши картинки и тексты; стили, персонажи и товарные знаки принадлежат их владельцам.\n\n**Кредиты**\n- Автор: Akula · Telegram [@NastasiaRom](https://t.me/NastasiaRom)\n- Группа со стилями, промптами и негативами: [@tavvvvoooosty](https://t.me/tavvvvoooosty)\n- При поддержке: [@darkxizon](https://t.me/darkxizon)": "Draws scenes right in your Tavo chat: NovelAI V5 / V4.5 (your own token or a proxy) and Naistera (a token from its Telegram bot, NovelAI V4.5 / V5).\n\n**Features**\n- Modes: auto for new replies, manual (a button under the reply) or off. Finished pictures are never redrawn when you reopen a chat and never cost a second generation.\n- The scene prompt is written by the chat model (inside the reply or as a separate request) or by your own API: OpenAI-compatible, Gemini or Claude.\n- Templates: regular scene, manga / manhwa, Marvel-style comic, chibi, Naistera V4 and your own.\n- Characters keep their looks from picture to picture: appearance and outfit tags for characters, your persona and NPCs (typed by hand, read from the card, found in the chat or remembered from the first picture); hair, eye and skin color stop drifting.\n- NovelAI settings as on the original site: model, size, quality tags, UC preset, sampler, noise schedule, steps and prompt guidance, each with an explanation.\n- Separate presets for each model: NovelAI V5 and Naistera V4 (the \"V5 | V4\" switch), each with its own styles with an example picture, negatives and prompts, never mixed up. Compact tiles with quick buttons: copy, duplicate, copy to another model.\n- Chat gallery: view, save to your phone gallery or to Files, delete.\n- Russian and English interface (the RU / EN button in the panel header). Themes: Sketchbook, Night sketch, Bimbo · Korean pick-me, Glass and \"like Tavo\", colours only and nothing extra. The picture in the chat is just the picture: buttons in a strip over it, arrows for variants and the style name in small print below. The panel and cards never break Tavo's look.\n\n**Styles, prompts and negatives**: ready-made sets in the Telegram group [@tavvvvoooosty](https://t.me/tavvvvoooosty).\n\nAll settings live in the Shark Image panel: the shark button on the chat screen or \"Image panel\" in the chat's right-hand menu. Advanced Rendering must be on.\n\n**Security and privacy**\n- Your NovelAI and Naistera tokens and API keys stay only on your device, encrypted, and are sent only to the service you choose.\n- The plugin collects no statistics and sends nothing to the author.\n- Unofficial plugin, not affiliated with NovelAI, Naistera or Tavo. The author claims no copyright on your images and texts; styles, characters and trademarks belong to their owners.\n\n**Credits**\n- Author: Akula · Telegram [@NastasiaRom](https://t.me/NastasiaRom)\n- Styles, prompts and negatives group: [@tavvvvoooosty](https://t.me/tavvvvoooosty)\n- Supported by: [@darkxizon](https://t.me/darkxizon)", "Что ушло в генерацию": "What was sent", "Как в Tavo": "Like Tavo", "Выбран": "Selected", "Свой": "Custom", "Список моделей": "Model list", "Панель картинок": "Image panel", "Авто": "Auto", "Пусто — официальный адрес платформы. Только https (или локальная сеть).": "Empty = the platform's official URL. https only (or local network).", "Ставятся в начало промпта каждой картинки.": "Placed at the start of every picture prompt.", "Активный негатив": "Active negative", "Запоминать внешность с первой картинки": "Remember looks from the first picture", "Ошибка сервера ({code}) — попробуйте позже": "Server error ({code}) — try again later", "NovelAI рисует": "NovelAI is drawing", "крем, розовый и голубой": "cream, pink and baby blue", "Скрыть старые маркеры сцен": "Hide old scene markers", "Тип": "Type", "В тексте нет [SCENE: — проверьте формат маркера": "The text has no [SCENE: — check the marker format", "Открыть картинку": "Open picture", "Кнопку можно перетаскивать. Если выключить — панель открывается из правого меню чата.": "Drag the button to move it. When off, open the panel from the chat's right menu.", "NovelAI · комикс Marvel": "NovelAI · Marvel-style comic", "Нет": "None", "Проверяю…": "Testing…", "Помогает найти персонажа в сцене, если имя не написано.": "Helps find the character in a scene when the name isn't written.", "Подключение": "Connection", "Точность следования промпту (CFG)": "Prompt guidance (CFG)", "Naistera рисует": "Naistera is drawing", "Все настройки — в панели Shark Image: акулья кнопка на экране чата или пункт «Панель картинок» в правом меню чата. Нужен включённый расширенный рендеринг.": "All settings live in the Shark Image panel: the shark button on the chat screen or \"Image panel\" in the chat's right menu. Advanced Rendering must be on.", "Нарисовать": "Draw", "V5: сцены, комиксы, текст в облачках, до 22 персонажей. Opus — бесплатно в пределах лимита V5.": "V5: scenes, comics, text in bubbles, up to 22 characters. Opus is free within the V5 limit.", "Название": "Name", "Naistera V4 · сцена": "Naistera V4 · scene", "Промпт пишет ваша модель из вкладки API — независимо от модели чата.": "Your model from the API tab writes the prompt, independent of the chat model.", "V5 Medium: быстрее и дешевле, фиксированно 14 шагов, Euler Ancestral и свой негатив NovelAI (ваш негатив и UC-пресет не применяются).": "V5 Medium: faster and cheaper, fixed 14 steps, Euler Ancestral and NovelAI's own negative (your negative and UC preset are not applied).", "Чисто и детально.": "Clean and detailed.", "Удалить ключ": "Delete key", "день или ночь — как в приложении": "day or night, following the app", "Из чата": "From chat", "Стиль из галереи": "Style from gallery", "Токен NovelAI": "NovelAI token", "Токен Naistera": "Naistera token", "Промпт сцены": "Scene prompt", "В Medium NovelAI сам ставит 14 шагов и Euler Ancestral — эти два поля не применяются.": "In Medium, NovelAI fixes 14 steps and Euler Ancestral — these two fields do not apply.", "Убрать": "Remove", "Только для наглядности — чтобы помнить, как выглядит стиль. В генерацию не отправляется.": "For reference only — to remember what the style looks like. It is not sent to generation.", "Сколько пикселей в картинке. «Обычный» — лучший выбор: на подписке Opus бесплатно. «Большой» — чётче лица, руки и мелкие детали, но тратит Anlas даже на Opus. «Маленький» — быстрее, но мыльнее. Пропорции (2:3, 16:9…) берутся из сцены.": "How many pixels the picture has. Normal is the best choice: free on Opus. Large gives sharper faces, hands and details but spends Anlas even on Opus. Small is faster but blurrier. The ratio (2:3, 16:9…) comes from the scene.", "Пресет негатива (UC)": "Undesired content preset", "Удалить все картинки этого чата ({n} шт.)?": "Delete all pictures in this chat ({n})?", "Ключ не подходит (401) — проверьте токен": "The key was rejected (401) — check the token", "В просмотре нажмите «Сохранить» — картинка попадёт в галерею телефона": "Tap Save in the viewer to put the picture into your phone gallery", "Инструкция для модели": "Instruction for the model", "Модель чата — отдельный запрос": "Chat model — separate request", "Добавить": "Add", "Служебные теги, которые NovelAI дописывает в конец промпта, чтобы картинка была красивее и детальнее. «Стандарт» — сильный эффект, «Лёгкие» — мягче и меньше влияют на стиль, «Нет» — промпт уходит как есть. Если на картинке есть реплики, «no text» плагин убирает сам — комиксам подходит «Стандарт».": "Helper tags NovelAI appends to the prompt to make the picture prettier and more detailed. Standard is strong, Light is softer and changes the style less, None sends the prompt as is. When the picture has lettering, the plugin drops «no text» itself, so Standard works for comics too.", "Мягче переходы, больше деталей.": "Softer transitions, more detail.", "Модель не вернула маркер сцены — нажмите «Повторить»": "The model returned no scene marker — tap Retry", "Опишите, как строить маркер [SCENE: ratio | prompt]…": "Describe how to build the [SCENE: ratio | prompt] marker…", "Расширенные настройки": "Advanced settings", "Вернуть стандартные": "Restore defaults", "Закрыть": "Close", "В «Файлы»": "To Files", "базовая защита": "basic protection", "Анатомия": "Anatomy", "Плагин неофициальный и не связан с NovelAI, Naistera и Tavo. Автор не претендует на авторские права на ваши картинки и тексты; стили, персонажи и товарные знаки принадлежат их владельцам. Генерация — по правилам и тарифам выбранного сервиса.": "Unofficial plugin, not affiliated with NovelAI, Naistera or Tavo. The author claims no copyright on your images and texts; styles, characters and trademarks belong to their owners. Generation follows the rules and prices of the service you choose.", "запомнено": "remembered", "Без Opus каждая картинка тратит Anlas.": "Without Opus every picture spends Anlas.", "Не получилось": "Something went wrong", "Стиль": "Style", "В ответе старый тег картинки Naistera с токеном — уберите эту инструкцию из пресета: Shark Image рисует сам, а токену не место в чате.": "The reply has an old Naistera image tag with your token — remove that instruction from your preset: Shark Image draws by itself, and the token does not belong in the chat.", "Панель не открылась: {err}": "The panel did not open: {err}", "Имя": "Name", "Стандарт": "Standard", "Пресеты": "Presets", "Удалить все": "Delete all", "— выберите модель —": "— pick a model —", "Переписать моделью": "Rewrite with model", "внешность не задана": "no looks yet", "Нет промпта сцены": "No scene prompt", "Подробности": "Details", "Арт-микс V4": "Art mix V4", "Найдено NPC: {n}. Отметьте, кого добавить:": "NPCs found: {n}. Pick who to add:", "Токен работает ✓ Тариф: {tier} · модели: {models}": "Token works ✓ Plan: {tier} · models: {models}", "Ключ API (api key)": "API key", "Другое": "Other", "Naistera не приняла токен — проверьте токен из бота": "Naistera rejected the token — check the token from the bot", "NovelAI · обычная сцена": "NovelAI · regular scene", "Добавляется к пресету UC NovelAI и отправляется в Naistera как негатив.": "Added to the NovelAI UC preset and sent to Naistera as the negative.", "Модель не добавила сцену в ответ — картинки не будет. Нажмите кнопку 🖼 под ответом, чтобы нарисовать вручную.": "The model added no scene to the reply — no picture. Tap the 🖼 button under the reply to draw it manually.", "Настройки": "Settings", "Новый негатив": "New negative", "Каждый новый ответ получает картинку сразу. Старые сообщения не перерисовываются.": "Every new reply gets a picture right away. Old messages are never redrawn.", "Naistera не приняла запрос ({code}): {detail}": "Naistera rejected the request ({code}): {detail}", "После ответа модель чата отдельным запросом пишет промпт. Текст ответа остаётся чистым.": "After the reply, the chat model writes the prompt in a separate request. The reply text stays clean.", "Теги стиля": "Style tags", "V4.5 рисует по своим промптам и стилям V4 (Пресеты → Стили → Naistera V4).": "V4.5 uses its own V4 prompts and styles (Presets → Styles → Naistera V4).", "Конфиденциальность. Плагин не собирает статистику и ничего не отправляет автору. Описание сцены уходит только в сервис, который рисует, а текст переписки — в модель, которая пишет промпт. Картинки хранятся в этом чате на вашем устройстве.": "Privacy. The plugin collects no statistics and sends nothing to the author. The scene description goes only to the service that draws, and chat text only to the model that writes the prompt. Pictures are stored in this chat on your device.", "Теги качества": "Quality tags", "Внешность": "Appearance", "Подключений пока нет.": "No connections yet.", "Модель чата — прямо в ответе": "Chat model — inside the reply", "Например: акварель": "For example: watercolor", "сохранён {mask} — введите новый, чтобы заменить": "saved {mask} — type a new one to replace", "Новых NPC в чате не нашлось": "No new NPCs found in the chat", "Сохранить": "Save", "ключей нет": "no keys saved", "Взять из чата": "Take from chat", "с": "s", "Название (name)": "Name", "Фоновый модуль": "Background module", "В очереди": "Queued", "Чисто, хорошо на малом числе шагов.": "Clean, good with few steps.", "Одежда": "Outfit", "Модель (model)": "Model", "Начинаю": "Starting", "Из галереи": "From gallery", "Сообщений контекста": "Context messages", "Например: аниме-сцена": "For example: anime scene", "Мягко и разнообразно — выбор по умолчанию.": "Soft and varied — the default choice.", "Новый NPC": "New NPC", "Платформа (model platform)": "Model platform", "Стандартный текст": "Default text", "Проверить токен": "Check token", "Новое подключение": "New connection", "Только для NovelAI V4.5 / V5: применяется к этому персонажу.": "NovelAI V4.5 / V5 only: applied to this character.", "Скопировать": "Copy", "Копия для {fam}": "Copy to {fam}", "Лучше для DPM++ 2M и 2M SDE.": "Best for DPM++ 2M and 2M SDE.", "Кнопка панели": "Panel button", "Удалить картинку с устройства?": "Delete this picture from the device?", "Добавьте подключение во вкладке API": "Add a connection in the API tab", "Стабильнее, меньше случайных деталей.": "More stable, fewer random details.", "Проверить": "Test", "Выберите картинку": "Pick a picture", "Ночной скетч": "Night sketch", "Положение кнопки сброшено": "Button position reset", "Найти NPC в чате": "Find NPCs in chat", "Сохраните токен NovelAI в панели": "Save your NovelAI token in the panel", "Эта модель Naistera не принимает негатив — он не отправляется.": "This Naistera model takes no negative — it is not sent.", "Комикс": "Comic", "Пол": "Gender", "Модель чата недоступна": "Chat model is unavailable", "Выкл": "Off", "Копия добавлена в {fam} ✓": "Copy added to {fam} ✓", "Ключ хранится только на этом устройстве в зашифрованном виде и отправляется только на указанный адрес. В сообщения, файлы и экспорт чата он не попадает.": "The key stays on this device only, stored encrypted, and is sent only to the URL above. It never goes into messages, files or chat exports.", "## 1.7.0\n\n- Где рисовать — NovelAI (свой токен), прокси NovelAI или Naistera. Остальные подключения убраны вместе со своими стилями, негативами и шаблонами: если было выбрано другое, плагин сам переключится на NovelAI, а ваши свои стили, негативы и промпты оттуда перейдут в пресеты V5\n- Пресеты: вместо меню «V5 ▾» — переключатель «V5 | V4» в одно касание. Под вкладками подписано, чьи это пресеты, а точка отмечает модель, которой плагин рисует сейчас\n- Меню темы, языка и «⋯» больше не закрываются сами, если список ещё чуть прокручивается после касания\n- Плагин стал меньше: убран код, который больше не нужен\n\n## 1.6.0\n\n- Темы стали проще и легче: только цвета — без текстур, скотча, рамок и рукописных шрифтов. Ровные разделы с тонкими линиями, выбранная плитка — цветная рамка\n- Новая тема «Стекло»: тёмное матовое стекло, чат просвечивает сквозь панель — всё внимание на РП. Она заменила «Бордовую готику»: если была выбрана готика, включится «Стекло»\n- «Альбом для рисования» — белый и синий, «Ночной скетч» — тёмно-синий с розовыми кнопками, «Бимбо» — крем, розовый и голубой\n- Картинка в чате — просто картинка: кнопки полупрозрачной полоской поверх низа, под картинкой мелко название стиля\n- Несколько вариантов — круглые стрелки ‹ › по бокам картинки, номер «2 / 3» рядом со стилем\n- Удаление в два касания с подсказкой «Нажмите ещё раз, чтобы удалить»; другая кнопка или листание отменяют\n- Тема включается мгновенно: панель не пересобирается, карточки в чате меняют цвет сразу\n- Легче для телефона: размытие — только у панели в «Стекле», карточкам не нужны шрифты, плагин стал меньше\n- Надёжнее: пока рисуется картинка, удаление и правка промпта ждут конца, листать можно — новая картинка не потеряется, набранный промпт не сбросится": "## 1.7.0\n\n- Where to draw: NovelAI (your own token), a NovelAI proxy or Naistera. Other connections are gone together with their styles, negatives and templates: if you had another one selected, the plugin switches to NovelAI by itself, and your own styles, negatives and prompts from there move to the V5 presets\n- Presets: the \"V5 ▾\" menu is now a one-tap \"V5 | V4\" switch. A line under the tabs says whose presets these are, and a dot marks the model the plugin draws with right now\n- The theme, language and \"⋯\" menus no longer close by themselves while the list is still scrolling a little after a tap\n- A smaller plugin: code that is no longer needed is gone\n\n## 1.6.0\n\n- Simpler, lighter themes: colours only, no textures, tape, frames or handwriting fonts. Flat sections with thin lines; the selected tile gets a coloured frame\n- New Glass theme: dark frosted glass with the chat showing through the panel, so the focus stays on the roleplay. It replaces Burgundy gothic: if you had gothic on, you now get Glass\n- Sketchbook is white and blue, Night sketch is navy with pink buttons, Bimbo is cream, pink and baby blue\n- The picture in the chat is just the picture: buttons in a translucent strip over its bottom and the style name in small print below\n- Several variants: round ‹ › arrows on the sides of the picture, with the number like \"2 / 3\" next to the style\n- Deleting takes two taps with a \"Tap again to delete\" hint; any other button or turning the page cancels it\n- Themes switch instantly: the panel is not rebuilt and the cards in the chat change colour right away\n- Lighter on your phone: blur only on the panel in Glass, no fonts for the cards, and a smaller plugin\n- More reliable: while a picture is drawing, deleting and prompt editing wait until it is done and turning the page is safe, so the new picture is never lost and a prompt you are typing is not reset", "Нет соединения с сервером": "Cannot reach the server", "Маркеры скрыты: {n}": "Markers hidden: {n}", "нет ключа": "no key", "Теги на английском. Внешность добавляется к блоку нужного героя в каждой картинке. Персонажи и персона хранятся навсегда, NPC — в этом чате.": "Tags in English. Looks are added to the right character's block in every picture. Characters and persona are saved for good, NPCs per chat.", "Готовые стили, промпты и негативы — в нашей Telegram-группе": "Ready-made styles, prompts and negatives — in our Telegram group", "Кнопку можно перетаскивать пальцем. Скрыть её можно в настройках плагина Tavo — тогда панель открывается из правого меню чата.": "Drag the button with your finger. Hide it in Tavo plugin settings — then open the panel from the chat's right menu.", "Токен NovelAI начинается с pst-": "A NovelAI token starts with pst-", "Если у героя внешность не задана, плагин запомнит, каким он получился на первой картинке, и дальше будет рисовать так же. Поправить можно здесь.": "If a character has no looks yet, the plugin remembers how they came out in the first picture and keeps them that way. You can edit it here.", "У подключения нет ключа": "The connection has no key", "не отвечает": "no response", "Нажмите ещё раз, чтобы удалить": "Tap again to delete", "V5 через Naistera рисует по основным промптам и стилям V5.": "V5 via Naistera uses the main V5 prompts and styles.", "Добавить NPC": "Add NPC", "Картинка не создана: {err}": "No picture: {err}", "Такие размер или шаги тратят Anlas даже на Opus.": "This size or step count spends Anlas even on Opus.", "Насколько строго модель следует промпту. 5–7 — золотая середина: ниже — свободнее и мягче, выше — точнее, но цвета жёстче.": "How strictly the model follows the prompt. 5–7 is the sweet spot: lower is freer and softer, higher is more exact but harsher colors.", "Сохранить ключ": "Save key", "Без стиля": "No style", "Стабильный, почти без шума.": "Stable, almost no noise.", "Персонаж": "Character", "Не получилось: нет описания в карточке или модель недоступна": "Failed: the card has no description or the model is unavailable", "Введите название": "Enter a name", "Прокси": "Proxy", "копия": "copy", "Реплики в облачках NovelAI рисует только латиницей, поэтому шаблоны комиксов переводят их на короткий английский. «no text» из тегов качества и мешающие теги из негатива плагин убирает сам.": "NovelAI letters only Latin text, so comic templates translate lines into short English. The plugin itself removes «no text» from quality tags and conflicting tags from the negative.", "Подключения для модели, которая пишет промпт сцены (режим «Своё API»).": "Connections for the model that writes the scene prompt (\"Own API\" mode).", "Анатомия V4": "Anatomy V4", "Удалено: {n}": "Deleted: {n}", "Новый промпт": "New prompt", "Из «Файлов»": "From Files", "Просмотр Tavo недоступен — сохраните в «Файлы»": "The Tavo viewer is unavailable — save to Files", "Скачать": "Download", "как в чате": "as written in the chat", "Прокси рисует": "Proxy is drawing", "Активный стиль": "Active style", "Отправлять мой токен NovelAI прокси": "Send my NovelAI token to the proxy", "Модель должна вывести одну строку [SCENE: соотношение | промпт]. Блоки персонажей разделяются « | ».": "The model must output one line [SCENE: ratio | prompt]. Character blocks are separated by \" | \".", "Промпт": "Prompt", "Промпт напишет модель": "The model will write the prompt", "Передавать модели внешность и описания персонажей": "Send character looks and descriptions to the model", "дневная: белый и синий": "day: white and blue", "Подключений нет. Добавьте OpenAI-совместимое (OpenRouter, DeepSeek и др.), Gemini или Claude.": "No connections. Add an OpenAI-compatible one (OpenRouter, DeepSeek, etc.), Gemini or Claude.", "англ. имя, прозвища через запятую": "English name, nicknames, comma-separated", "Если модель пишет имя иначе — например, латиницей.": "If the model writes the name differently — for example, in Latin letters.", "Под ответом появляется кнопка «Нарисовать» — Anlas тратятся только по нажатию.": "A Draw button appears under replies — Anlas are spent only when you tap it.", "{n} шт. · {size}": "{n} pictures · {size}", "Ещё": "More", "Файлы чата": "Chat files", "токен из бота Naistera": "token from the Naistera bot", "Пресеты для": "Presets for", "Модель": "Model", "Когда рисовать": "When to draw", "Нет подписки или Anlas (402)": "No subscription or Anlas (402)", "Следующий вариант": "Next variant", "Стиль и негатив": "Style and negative", "Обычная сцена": "Regular scene", "Ключи в безопасности. Токены NovelAI и Naistera и ключи API хранятся только на этом устройстве в зашифрованном виде и уходят только в выбранный вами сервис. В сообщения, экспорт чата и к автору они не попадают.": "Your keys are safe. NovelAI and Naistera tokens and API keys are stored only on this device, encrypted, and go only to the service you choose. They never end up in messages, chat exports or with the author.", "Стандартный": "Standard", "Тема": "Theme", "Нарисовать сцену": "Draw scene", "Где рисовать": "Where to draw", "Сохранить картинку": "Save the picture", "Сделать стилем": "Use as style", "Предыдущий вариант": "Previous variant", "В Naistera закончился лимит генераций (402)": "Your Naistera generation limit is used up (402)", "ночная: тёмно-синий и розовый": "night: navy and pink", "Если картинки не появляются — нажмите и пришлите скриншот результата. Ничего не тратит.": "If pictures do not appear, tap this and send a screenshot of the result. Costs nothing.", "сейчас": "now", "Адрес должен начинаться с https://": "The URL must start with https://", "Стекло": "Glass", "Большой": "Large", "Сначала впишите имя": "Enter a name first", "Негативы": "Negatives", "Самый экономный: модель дописывает в конец ответа скрытый маркер сцены. Инструкция добавляется только в запрос, в чате её не видно.": "Cheapest: the model appends a hidden scene marker to its reply. The instruction is added to the request only and never shows in the chat.", "В пределах бесплатной генерации Opus (≤ 1 млн пикселей и ≤ 28 шагов).": "Within Opus free generation (≤ 1 MP and ≤ 28 steps).", "Открываю…": "Opening…", "Показать ещё ({n})": "Show more ({n})", "Плагин ничего не добавляет в ответы. Уже готовые картинки остаются на месте.": "The plugin adds nothing to replies. Existing pictures stay in place.", "Своё API (отдельная модель)": "Own API (separate model)", "Модель не нашла описания этого NPC в чате": "The model found no description of this NPC in the chat", "Готовый список того, чего на картинке быть не должно: размытие, артефакты, кривая анатомия. Добавляется перед вашим негативом. Heavy — максимальная чистка, Light — мягче, оставляет больше стиля, Human Focus — ещё следит за лицами и глазами, «Нет» — только ваш негатив. Теги, которые прямо просит промпт (например, screentone в манге), из негатива убираются сами.": "A ready list of what must not appear: blur, artifacts, broken anatomy. It goes before your negative. Heavy cleans the most, Light is softer and keeps more style, Human Focus also watches faces and eyes, None uses only your negative. Tags the prompt asks for (like screentone in manga) are removed from the negative automatically.", "Кто пишет промпт": "Who writes the prompt", "зашифрованы, ключ шифрования отдельно": "encrypted, cipher key stored separately", "Новый стиль": "New style", "Адрес прокси": "Proxy URL", "Соотношение": "Ratio", "Скопировано ✓": "Copied ✓", "Герои": "Characters", "Не удалось сохранить файл": "Could not save the file", "Автор: Akula · Telegram: t.me/NastasiaRom\nГруппа со стилями: @tavvvvoooosty\nПри поддержке: @darkxizon": "Author: Akula · Telegram: t.me/NastasiaRom\nStyles group: @tavvvvoooosty\nSupported by: @darkxizon", "Копия готова ✓": "Copy made ✓", "NovelAI · чиби": "NovelAI · chibi", "токен из Telegram-бота Naistera": "token from the Naistera Telegram bot", "Сохраните токен Naistera в панели": "Save your Naistera token in the panel", "Для Naistera V4 видны только промпты V4 — промпты V5 сюда не подходят.": "Naistera V4 shows only V4 prompts — V5 prompts do not fit it.", "Удалить «{name}»?": "Delete \"{name}\"?", "Naistera не смогла нарисовать: {detail}": "Naistera could not draw it: {detail}", "NovelAI занят, жду": "NovelAI is busy, waiting", "Работает ✓ Ответ: {text}": "Works ✓ Reply: {text}", "Главное": "Main", "Сохранено ✓": "Saved ✓", "Защита ключей": "Key protection", "Стили": "Styles", "В этом чате пока нет картинок.": "No pictures in this chat yet.", "работает": "works", "Заполнить из карточки": "Fill from card", "Сцена": "Scene", "«Стандарт» — плагин дописывает теги качества NovelAI в конец промпта, «Нет» — промпт уходит как есть.": "Standard: the plugin appends NovelAI quality tags to the prompt. None: the prompt goes as is.", "Удалить": "Delete", "Галерея": "Gallery", "Открыть панель картинок": "Open image panel", "Удалить сохранённый ключ с этого устройства?": "Delete the saved key from this device?", "«Комикс» — страница с панелями и репликами, «Обычная сцена» — одна картинка.": "Comic: a page with panels and speech bubbles. Regular scene: a single picture.", "Похоже, это не токен Naistera — скопируйте его из бота целиком": "This does not look like a Naistera token — copy it from the bot in full", "Альбом для рисования": "Sketchbook", "Промпты": "Prompts", "NovelAI · манга / манхва": "NovelAI · manga / manhwa", "Маленький": "Small", "Плавающая кнопка панели на экране чата": "Floating panel button on the chat screen", "Файл картинки не найден — нажмите ↻": "Picture file not found — tap ↻", "Система не дала скопировать — выделите текст и скопируйте вручную": "The system blocked copying — select the text and copy it manually", "Больше шагов — детальнее, но дольше. 28 — максимум для бесплатной генерации на Opus.": "More steps = more detail but slower. 28 is the maximum for free Opus generation.", "Подходит почти всем сэмплерам — выбор по умолчанию.": "Fits almost every sampler — the default.", "Бимбо · корейский пикми": "Bimbo · Korean pick-me", "Пишу промпт": "Writing prompt", "Парень": "Boy", "Ещё вариант": "Another variant", "Вручную": "Manual", "Плагин ничего не дописывает в запрос и просто ловит маркер [SCENE: …] (или старый [ИМЯ_SCENE: …]) в ответе.": "The plugin adds nothing to the request and just catches the [SCENE: …] marker (or an older [NAME_SCENE: …]) in the reply.", "Загружаю…": "Loading…", "Вернуть стандартные шаблоны? Их текст будет восстановлен, ваши свои промпты останутся.": "Restore the default templates? Their text will be restored; your own prompts stay.", "Дополнительно": "Advanced", "Новый": "New", "Инфо": "Details", "Стоп": "Stop"};
    function localize4(root) {
        if (!root || S().lang !== 'en') return;
        const tx = (v) => I18N4[v] || v;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes=[]; let n; while ((n=walker.nextNode())) nodes.push(n);
        nodes.forEach((node) => { const v=node.nodeValue; const t=v.trim(); if (t && I18N4[t]) node.nodeValue=v.replace(t,tx(t)); });
        if (root.querySelectorAll) root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
            ['placeholder','title','aria-label'].forEach((a) => { const v=el.getAttribute(a); if (v && I18N4[v]) el.setAttribute(a,tx(v)); });
        });
    }

    const ctx = () => { if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) throw new Error('нет SillyTavern.getContext'); return SillyTavern.getContext(); };

    // CSS встроен в JS: даже если style.css не доехал, интерфейс не развалится
    (function injectCss() {
        try {
            const st = document.createElement('style');
            st.id = 'shk4_css';
            st.textContent = ".sci-panelroot,.sci-card{all:initial;display:block;--sci-ff:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,system-ui,sans-serif;font-family:var(--sci-ff);font-size:14px;line-height:1.4;font-weight:400;color:var(--sci-text);text-align:left;-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}.sci-panelroot button,.sci-panelroot input,.sci-panelroot select,.sci-panelroot textarea,.sci-card button,.sci-card input,.sci-card select,.sci-card textarea{font-family:var(--sci-ff);letter-spacing:normal;text-transform:none;text-shadow:none}.sci-panelroot button,.sci-card button,.sci-panelroot [role=button]{touch-action:manipulation}.sci-panelroot,.sci-card{--sci-titlef:\"SciTitle\",var(--sci-ff);--sci-blur:none;--sci-glassline:transparent}[data-sci-theme=\"day\"]{color-scheme:light;--sci-bg:#ffffff;--sci-surface:#ffffff;--sci-tile:#ffffff;--sci-s2:#f4f5fd;--sci-line:#e3e6f6;--sci-text:#3f4689;--sci-muted:#8b8dab;--sci-acc:#6a7fd0;--sci-acc2:#5568c4;--sci-accsoft:#eef0ff;--sci-ontxt:#ffffff;--sci-danger:#e0566a;--sci-ok:#2f9e74;--sci-warn:#b26b00;--sci-shadow:0 12px 30px rgba(63,70,137,.16);--sci-title:#5f72c9;--sci-h3:#3f4689;--sci-tabon:#eef0ff;--sci-tabtx:#5568c4;--sci-glass:rgba(255,255,255,.9);--sci-glasstx:#5568c4;--sci-capt:#8f92ad;--sci-glassline:rgba(63,70,137,.08);--sci-busy:#f4f5fd;--sci-busyover:rgba(255,255,255,.5);--sci-bub-edge:rgba(106,127,208,.55);--sci-bub-tint:rgba(140,198,240,.3);--sci-spk1:#f4a0ba;--sci-spk2:#8cc6f0;--sci-spk3:#f2c46a}[data-sci-theme=\"night\"]{color-scheme:dark;--sci-bg:#1c2238;--sci-surface:#232a46;--sci-tile:#202842;--sci-s2:#262e4a;--sci-line:#2e3654;--sci-text:#e7eaf8;--sci-muted:#8f97bd;--sci-acc:#f4a0ba;--sci-acc2:#f7b6ca;--sci-accsoft:rgba(244,160,186,.15);--sci-ontxt:#1c2238;--sci-danger:#ff7a85;--sci-ok:#6fd6a3;--sci-warn:#f2c46a;--sci-shadow:0 14px 36px rgba(0,0,0,.45);--sci-title:#f2c46a;--sci-h3:#e7eaf8;--sci-tabon:rgba(244,160,186,.15);--sci-tabtx:#f7b6ca;--sci-glass:rgba(28,34,56,.86);--sci-glasstx:#f7b6ca;--sci-capt:#7d86ad;--sci-glassline:rgba(255,255,255,.07);--sci-busy:#1f2640;--sci-busyover:rgba(28,34,56,.45);--sci-bub-edge:rgba(255,255,255,.7);--sci-bub-tint:rgba(150,210,255,.22);--sci-spk1:#f4a0ba;--sci-spk2:#8cc6f0;--sci-spk3:#f2c46a}[data-sci-theme=\"bimbo\"]{color-scheme:light;--sci-bg:#fffaf6;--sci-surface:#ffffff;--sci-tile:#ffffff;--sci-s2:#fdeef2;--sci-line:#f3e3da;--sci-text:#5a4450;--sci-muted:#a68f99;--sci-acc:#f07399;--sci-acc2:#e05f86;--sci-accsoft:#fdeef2;--sci-ontxt:#ffffff;--sci-danger:#d8394b;--sci-ok:#3aa57a;--sci-warn:#c27c00;--sci-shadow:0 12px 30px rgba(171,120,110,.18);--sci-title:#ef7fa3;--sci-h3:#5a4450;--sci-tabon:#e8f2ff;--sci-tabtx:#5b93d8;--sci-glass:rgba(255,250,246,.9);--sci-glasstx:#e05f86;--sci-capt:#a68896;--sci-glassline:rgba(240,115,153,.12);--sci-busy:#fff3f6;--sci-busyover:rgba(255,250,246,.5);--sci-bub-edge:rgba(240,115,153,.55);--sci-bub-tint:rgba(191,220,255,.35);--sci-spk1:#ffb8c8;--sci-spk2:#8cc1ff;--sci-spk3:#ffd36e}[data-sci-theme=\"glass\"]{color-scheme:dark;--sci-bg:rgba(24,22,32,.74);--sci-surface:rgba(38,34,48,.94);--sci-tile:rgba(255,255,255,.06);--sci-s2:rgba(255,255,255,.07);--sci-line:rgba(255,255,255,.12);--sci-text:#f3f1f7;--sci-muted:rgba(243,241,247,.58);--sci-acc:#ffffff;--sci-acc2:#ffffff;--sci-accsoft:rgba(255,255,255,.13);--sci-ontxt:#1b1822;--sci-danger:#ff7d8a;--sci-ok:#7ee0b0;--sci-warn:#ffd27a;--sci-shadow:0 18px 44px rgba(0,0,0,.45);--sci-title:#ffffff;--sci-h3:rgba(243,241,247,.55);--sci-tabon:rgba(255,255,255,.14);--sci-tabtx:#ffffff;--sci-glass:rgba(20,18,26,.62);--sci-glasstx:#ffffff;--sci-capt:#8e8ea0;--sci-glassline:rgba(255,255,255,.14);--sci-busy:rgba(28,25,36,.86);--sci-busyover:rgba(20,18,26,.42);--sci-bub-edge:rgba(255,255,255,.7);--sci-bub-tint:rgba(255,255,255,.16);--sci-spk1:#ffffff;--sci-spk2:#e6e1f2;--sci-spk3:#cfc7e6;--sci-titlef:var(--sci-ff);--sci-blur:blur(18px) saturate(1.2)}@media (prefers-reduced-transparency:reduce){[data-sci-theme=\"glass\"]{--sci-bg:#1c1a24;--sci-blur:none}}@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){[data-sci-theme=\"glass\"]{--sci-bg:#1c1a24;--sci-blur:none}}.sci-ic{width:18px;height:18px;flex:none;display:block}.sci-b{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:var(--sci-muted);cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}.sci-b:active{transform:scale(.94)}.sci-b.sci-on{background:var(--sci-accsoft);color:var(--sci-acc2)}.sci-b.sci-off{opacity:.35;pointer-events:none}.sci-b.sci-danger{background:var(--sci-danger);color:#fff}.sci-pill{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 13px;border-radius:999px;border:1px solid transparent;background:var(--sci-acc);color:var(--sci-ontxt);font:600 13px/1 var(--sci-ff);cursor:pointer;-webkit-tap-highlight-color:transparent;white-space:nowrap}.sci-pill .sci-ic{width:16px;height:16px}.sci-pill:active{transform:scale(.97)}.sci-pill.sci-ghost{background:var(--sci-accsoft);color:var(--sci-acc2)}.sci-pill.sci-danger{background:var(--sci-danger);color:#fff}.sci-pill.sci-dangert{color:var(--sci-danger);background:transparent;border-color:var(--sci-line)}.sci-pill[disabled],.sci-pill.sci-wait{opacity:.55;pointer-events:none}.sci-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.sci-row.sci-end{justify-content:flex-end}.sci-hint{margin:6px 0 0;font-size:12px;line-height:1.45;color:var(--sci-muted)}.sci-ok{margin:8px 0 0;font-size:12px;line-height:1.4;color:var(--sci-ok)}.sci-warn{margin:8px 0 0;font-size:12px;line-height:1.4;color:var(--sci-warn)}.sci-bubbles{position:absolute;inset:0;overflow:hidden;pointer-events:none}.sci-bubbles i{position:absolute;bottom:-28px;border-radius:50%;background:radial-gradient(circle at 32% 30%,rgba(255,255,255,.95) 0,rgba(255,255,255,.5) 22%,var(--sci-bub-tint) 60%,rgba(150,210,255,.06) 100%);border:1px solid var(--sci-bub-edge);box-shadow:inset -2px -2px 5px rgba(120,190,255,.3);animation:sci-rise 3.6s cubic-bezier(.45,.05,.55,.95) infinite;will-change:transform,opacity}.sci-bubbles i:nth-child(1){left:8%;width:16px;height:16px;animation-duration:3.6s;animation-delay:-0.4s}.sci-bubbles i:nth-child(2){left:19%;width:10px;height:10px;animation-duration:3.0s;animation-delay:-1.7s}.sci-bubbles i:nth-child(3){left:30%;width:22px;height:22px;animation-duration:4.4s;animation-delay:-2.9s}.sci-bubbles i:nth-child(4){left:41%;width:12px;height:12px;animation-duration:3.2s;animation-delay:-0.9s}.sci-bubbles i:nth-child(5){left:52%;width:18px;height:18px;animation-duration:4.0s;animation-delay:-2.2s}.sci-bubbles i:nth-child(6){left:61%;width:9px;height:9px;animation-duration:2.7s;animation-delay:-0.2s}.sci-bubbles i:nth-child(7){left:70%;width:26px;height:26px;animation-duration:4.8s;animation-delay:-3.6s}.sci-bubbles i:nth-child(8){left:80%;width:12px;height:12px;animation-duration:3.3s;animation-delay:-1.3s}.sci-bubbles i:nth-child(9){left:88%;width:17px;height:17px;animation-duration:3.9s;animation-delay:-2.6s}.sci-bubbles i:nth-child(10){left:25%;width:8px;height:8px;animation-duration:2.6s;animation-delay:-1.1s}.sci-bubbles i:nth-child(11){left:46%;width:7px;height:7px;animation-duration:2.5s;animation-delay:-2.0s}.sci-bubbles i:nth-child(12){left:75%;width:9px;height:9px;animation-duration:2.8s;animation-delay:-0.6s}.sci-bubbles b{position:absolute;width:12px;height:12px;background:var(--sci-spk1);clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);opacity:.2;animation:sci-tw 2.2s ease-in-out infinite;will-change:transform,opacity}.sci-bubbles b:nth-of-type(1){left:12%;top:14%;animation-delay:-.2s}.sci-bubbles b:nth-of-type(2){left:80%;top:20%;width:9px;height:9px;background:var(--sci-spk2);animation-delay:-.9s}.sci-bubbles b:nth-of-type(3){left:33%;top:46%;width:15px;height:15px;background:var(--sci-spk3);animation-delay:-1.5s}.sci-bubbles b:nth-of-type(4){left:66%;top:58%;width:10px;height:10px;animation-delay:-.6s}.sci-bubbles b:nth-of-type(5){left:20%;top:72%;width:8px;height:8px;background:var(--sci-spk2);animation-delay:-1.2s}.sci-bubbles b:nth-of-type(6){left:52%;top:10%;width:11px;height:11px;background:var(--sci-spk3);animation-delay:-1.8s}@keyframes sci-rise{0%{transform:translate3d(0,0,0) scale(.55);opacity:0}12%{opacity:1}35%{transform:translate3d(7px,-170px,0) scale(.85)}65%{transform:translate3d(-6px,-320px,0) scale(1)}92%{opacity:.9}100%{transform:translate3d(4px,-480px,0) scale(1.05);opacity:0}}@keyframes sci-tw{0%,100%{opacity:.2;transform:scale(.7) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(20deg)}}@media (prefers-reduced-motion:reduce){.sci-bubbles i{animation:none;opacity:.5;bottom:20%}.sci-bubbles b{animation:none;opacity:.6}}.sci-fab{position:fixed;z-index:60;width:54px;height:54px;border:0;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;padding:0;transition:transform .12s}.sci-panelroot .sci-fab{touch-action:none}.sci-panelroot.sci-isopen .sci-fab{visibility:hidden}.sci-fabimg{width:54px;height:54px;display:block;pointer-events:none;-webkit-user-drag:none;user-select:none;filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))}.sci-fab:active{transform:scale(.93)}.sci-fab.sci-drag{transform:scale(1.1)}.sci-fab:focus-visible{outline:2px solid var(--sci-acc);outline-offset:2px}.sci-backdrop{position:fixed;inset:0;z-index:61;background:rgba(6,14,28,.28)}.sci-sheet{position:fixed;z-index:62;left:10px;right:10px;margin:0 auto;max-width:560px;top:calc(var(--tavo-inset-top-bar,0px) + 8px);bottom:calc(var(--tavo-inset-bottom-input,0px) + 8px);display:flex;flex-direction:column;background:var(--sci-bg);-webkit-backdrop-filter:var(--sci-blur);backdrop-filter:var(--sci-blur);border:1px solid var(--sci-line);border-radius:22px;box-shadow:var(--sci-shadow);overflow:hidden}[data-sci-theme=\"glass\"] .sci-backdrop{background:rgba(0,0,0,.12)}[data-sci-theme=\"glass\"] .sci-menu,[data-sci-theme=\"glass\"] .sci-mbox{background:#27232f}.sci-sheet.sci-pulse{animation:sci-pl .4s}@keyframes sci-pl{50%{transform:scale(.985)}}.sci-head{display:flex;align-items:center;gap:4px;padding:10px 6px 6px 10px}.sci-head>.sci-b{width:32px;height:32px;flex:none}.sci-logo{width:40px;height:40px;flex:none;object-fit:contain;margin-right:4px;-webkit-user-drag:none;user-select:none}.sci-title{position:relative;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;min-width:0}.sci-trow{display:flex;align-items:center;gap:8px;min-width:0}.sci-ttl{font:700 22px/1.05 var(--sci-titlef);letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;color:var(--sci-title)}[data-sci-theme=\"glass\"] .sci-ttl{font-size:17px;letter-spacing:.2px}.sci-credit{font-size:11px;letter-spacing:.04em;color:var(--sci-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .2s}.sci-saved{position:absolute;left:0;bottom:0;padding-right:8px;font-size:11px;line-height:1.3;color:var(--sci-ok);opacity:0;transition:opacity .25s;white-space:nowrap;pointer-events:none}.sci-saved.show{opacity:1}.sci-saving .sci-credit{opacity:0}.sci-saved.bad{color:var(--sci-danger)}.sci-hpill{flex:none;display:inline-flex;align-items:center;gap:3px;height:30px;padding:0 8px;border-radius:10px;border:1px solid var(--sci-line);background:var(--sci-accsoft);color:var(--sci-acc2);font:700 12px/1 var(--sci-ff);cursor:pointer;-webkit-tap-highlight-color:transparent}.sci-hpill .sci-ic{width:14px;height:14px}.sci-hpill:active{transform:scale(.96)}.sci-tabs{display:flex;gap:2px;padding:0 8px 8px;overflow-x:auto;scrollbar-width:none}.sci-tabs::-webkit-scrollbar{display:none}.sci-tab{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:7px 2px;border:0;border-radius:12px;background:transparent;color:var(--sci-muted);font:600 10.5px/1.1 var(--sci-ff);cursor:pointer}.sci-tab span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sci-tab.on{background:var(--sci-tabon);color:var(--sci-tabtx);font-weight:700}.sci-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:2px 12px 16px}.sci-pad{padding:0 4px}.sci-card2{padding:14px 4px 12px;margin:0;border-top:1px solid var(--sci-line)}.sci-body>section.sci-card2:first-of-type{border-top:0}.sci-card2 h3{margin:0 0 8px;font:800 13px/1.2 var(--sci-ff);color:var(--sci-h3)}[data-sci-theme=\"glass\"] .sci-card2 h3{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase}.sci-card2 h3.sci-name{text-transform:none;letter-spacing:0;font:700 16px/1.2 var(--sci-ff);color:var(--sci-text);display:flex;align-items:center;gap:8px;text-align:left}.sci-f{display:flex;flex-direction:column;gap:5px;margin:10px 0 0}.sci-fl{font-size:12px;font-weight:600;color:var(--sci-text)}.sci-in{width:100%;box-sizing:border-box;border:1px solid var(--sci-line);border-radius:11px;background:var(--sci-s2);color:var(--sci-text);padding:9px 11px;font:14px/1.35 var(--sci-ff);outline:none;-webkit-appearance:none;appearance:none}select.sci-in{background-image:linear-gradient(45deg,transparent 50%,var(--sci-muted) 50%),linear-gradient(135deg,var(--sci-muted) 50%,transparent 50%);background-position:calc(100% - 16px) 55%,calc(100% - 11px) 55%;background-size:5px 5px;background-repeat:no-repeat;padding-right:30px}.sci-in:focus{border-color:var(--sci-acc);box-shadow:0 0 0 3px var(--sci-accsoft)}.sci-ta2{resize:vertical;font:12.5px/1.45 ui-monospace,Menlo,monospace}.sci-seg{display:flex;gap:4px;padding:3px;border-radius:13px;background:var(--sci-s2)}.sci-seg button{flex:1;min-height:32px;border:0;border-radius:10px;background:transparent;color:var(--sci-muted);font:600 12.5px/1.1 var(--sci-ff);cursor:pointer;padding:6px 4px}.sci-seg button.on{background:var(--sci-acc);color:var(--sci-ontxt);box-shadow:0 1px 4px rgba(0,0,0,.12)}.sci-rng{display:flex;align-items:center;gap:10px}.sci-rng input{flex:1;accent-color:var(--sci-acc)}.sci-rng b{min-width:44px;text-align:right;font-size:12.5px;color:var(--sci-acc2)}.sci-sw{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13px;cursor:pointer}.sci-sw input{position:absolute;opacity:0;pointer-events:none}.sci-sw i{position:relative;width:38px;height:22px;flex:none;border-radius:999px;background:var(--sci-line);transition:background .2s}.sci-sw i:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.25)}.sci-sw input:checked+i{background:var(--sci-acc)}.sci-sw input:checked+i:after{transform:translateX(16px)}.sci-keyrow{display:flex;gap:6px;align-items:center}.sci-det2{margin-top:12px;border-top:1px solid var(--sci-line);padding-top:8px}.sci-det2 summary{cursor:pointer;font-weight:600;font-size:13px;color:var(--sci-acc2);list-style:none}.sci-det2 summary::-webkit-details-marker{display:none}.sci-det2 summary:before{content:'+ '}.sci-det2[open] summary:before{content:'– '}.sci-badge{display:inline-block;font-size:11px;font-weight:600;color:var(--sci-acc2);background:var(--sci-accsoft);border-radius:999px;padding:3px 9px}.sci-li{display:flex;align-items:center;gap:10px;background:var(--sci-tile);border:1px solid var(--sci-line);border-radius:14px;padding:8px 8px 8px 10px;margin:8px 0}.sci-li.on{border-color:var(--sci-acc);box-shadow:0 0 0 3px var(--sci-accsoft)}.sci-radio{width:24px;height:24px;flex:none;border-radius:50%;border:2px solid var(--sci-line);background:transparent;color:var(--sci-ontxt);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.sci-li.on .sci-radio{background:var(--sci-acc);border-color:var(--sci-acc)}.sci-radio .sci-ic{width:14px;height:14px}.sci-lt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left;border:0;background:transparent;color:var(--sci-text);padding:2px 0;cursor:pointer;font:inherit}.sci-lt b{font-size:13.5px}.sci-lt span{font-size:11.5px;color:var(--sci-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sci-thumb{width:46px;height:46px;flex:none;border-radius:10px;object-fit:cover;background:var(--sci-s2)}.sci-thumbrow{display:flex;gap:10px;align-items:center;margin-top:10px}.sci-pvtext{font-size:11.5px;color:var(--sci-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.sci-imgbox{border-radius:14px;overflow:hidden;border:1px solid var(--sci-line)}.sci-ex{display:block;width:100%;max-height:260px;object-fit:cover}.sci-ex0{height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--sci-muted);font-size:12px;background:var(--sci-s2)}.sci-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;min-height:60px}.sci-gi{padding:0;border:0;border-radius:10px;overflow:hidden;aspect-ratio:1/1;background:var(--sci-s2);cursor:pointer}.sci-gi img{width:100%;height:100%;object-fit:cover;display:block}.sci-galhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;font-size:12.5px;color:var(--sci-muted)}.sci-big{display:block;width:100%;border-radius:12px;cursor:zoom-in}.sci-modal{position:absolute;inset:0;z-index:8;background:rgba(6,14,28,.4);display:flex;align-items:center;justify-content:center;padding:18px}.sci-mbox{width:100%;max-width:380px;background:var(--sci-surface);border:1px solid var(--sci-line);border-radius:18px;padding:16px;box-shadow:var(--sci-shadow)}.sci-mbox p{margin:0 0 4px;font-size:14px}.sci-pick{max-height:80%;overflow:auto}.sci-col{display:flex;flex-direction:column;gap:2px}.sci-npc{border:1px solid var(--sci-line);border-radius:14px;margin:10px 0 0;background:var(--sci-s2)}.sci-npc>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer}.sci-npc>summary::-webkit-details-marker{display:none}.sci-npc[open]>summary{border-bottom:1px solid var(--sci-line)}.sci-npc>.sci-f,.sci-npc>.sci-row{margin-left:12px;margin-right:12px}.sci-npc>.sci-row{margin-bottom:12px}.sci-npch{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.sci-npch b{font-size:13.5px}.sci-npch span{font-size:11.5px;color:var(--sci-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sci-chev{color:var(--sci-muted);transition:transform .2s}.sci-npc[open] .sci-chev{transform:rotate(90deg)}.sci-pickrow{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--sci-line);cursor:pointer}.sci-pickrow input{margin-top:3px;accent-color:var(--sci-acc);width:18px;height:18px;flex:none}.sci-notes{position:fixed;z-index:70;left:12px;right:12px;top:calc(var(--tavo-inset-top-bar,0px) + 8px);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}.sci-note2{pointer-events:auto;max-width:520px;display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:14px;background:var(--sci-surface);color:var(--sci-text);border:1px solid var(--sci-line);box-shadow:var(--sci-shadow);font-size:13px;line-height:1.35;animation:sci-in .25s ease-out;transition:opacity .3s,transform .3s}.sci-note2.sci-error{border-color:rgba(224,72,79,.5)}.sci-note2.sci-error .sci-ntext{color:var(--sci-danger)}.sci-note2.sci-out{opacity:0;transform:translateY(-6px)}.sci-nic{flex:none;width:30px;height:30px;display:flex;align-items:center;justify-content:center}.sci-nimg{width:30px;height:30px;object-fit:contain;display:block}@keyframes sci-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}.sci-bubwrap{position:relative;height:90px;grid-column:1/-1;border-radius:12px;overflow:hidden;background:var(--sci-busy)}.sci-diag{margin-top:8px}.sci-drow{display:grid;grid-template-columns:20px auto 1fr;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--sci-line);font-size:12.5px}.sci-drow b{font-weight:600}.sci-drow span:last-child{color:var(--sci-muted);text-align:right;word-break:break-word}.sci-drow.ok .sci-ic{color:var(--sci-ok)}.sci-drow.bad .sci-ic{color:var(--sci-danger)}.sci-tghint{display:flex;gap:12px;align-items:center;margin:14px 0 6px;padding:12px 12px 12px 10px;border-radius:16px;background:var(--sci-s2)}.sci-tghint .sci-nic{width:44px;height:44px}.sci-tghint .sci-nimg{width:44px;height:44px}.sci-tgt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.sci-tgt b{font-size:13.5px;color:var(--sci-text)}.sci-tgt span{font-size:12px;line-height:1.4;color:var(--sci-muted)}.sci-tgt .sci-pill{align-self:flex-start;margin-top:6px;min-height:30px;padding:0 12px;font-size:12.5px}.sci-auto{display:inline-block;margin-left:8px;font-size:10.5px;font-weight:600;color:var(--sci-ok);border:1px solid currentColor;border-radius:999px;padding:1px 7px;vertical-align:1px}.sci-menu{position:absolute;z-index:7;min-width:200px;max-width:calc(100% - 16px);max-height:70%;overflow:auto;background:var(--sci-surface);border:1px solid var(--sci-line);border-radius:14px;padding:4px;box-shadow:var(--sci-shadow);animation:sci-in .14s ease-out}.sci-mtitle{padding:7px 10px 5px;font-size:11.5px;color:var(--sci-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sci-mi{width:100%;display:flex;align-items:center;gap:8px;padding:9px 10px;border:0;border-radius:10px;background:transparent;color:var(--sci-text);text-align:left;cursor:pointer;font:inherit}.sci-mi>.sci-ic{color:var(--sci-muted);width:17px;height:17px}.sci-mi.on{background:var(--sci-accsoft);color:var(--sci-acc2)}.sci-mi.sci-dangert,.sci-mi.sci-dangert>.sci-ic{color:var(--sci-danger)}.sci-mi:active{transform:scale(.98)}.sci-mil{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.sci-mil b{font-size:14px;font-weight:600}.sci-mil span{font-size:11.5px;color:var(--sci-muted);font-weight:400}.sci-mi em{font-style:normal;font-size:10.5px;font-weight:700;color:var(--sci-ok);border:1px solid currentColor;border-radius:999px;padding:1px 6px}.sci-mck{color:var(--sci-acc2)}.sci-ltabs{display:flex;align-items:center;gap:8px;margin:4px 2px 10px;border-bottom:1px solid var(--sci-line)}.sci-ltl{flex:1;min-width:0;display:flex;gap:12px;overflow-x:auto;scrollbar-width:none}.sci-ltl::-webkit-scrollbar{display:none}.sci-ltab{flex:none;padding:9px 0 7px;border:0;border-bottom:2.5px solid transparent;margin-bottom:-1px;background:transparent;color:var(--sci-muted);font:600 14px/1.2 var(--sci-ff);cursor:pointer;white-space:nowrap}.sci-ltab.on{color:var(--sci-text);font-weight:800;border-bottom-color:var(--sci-acc)}.sci-libhead{margin:4px 2px 10px}.sci-libhead .sci-ltabs{margin:0}.sci-famsw{flex:none;display:inline-flex;gap:2px;padding:2px;margin-bottom:5px;border-radius:10px;background:var(--sci-s2)}.sci-famsw button{position:relative;min-width:32px;height:26px;padding:0 8px 0 6px;border:0;border-radius:8px;background:transparent;color:var(--sci-muted);font:800 12px/1 var(--sci-ff);cursor:pointer}.sci-famsw button.on{background:var(--sci-acc);color:var(--sci-ontxt);box-shadow:0 1px 3px rgba(0,0,0,.12)}.sci-famsw button::after{content:'';position:absolute;left:0;right:0;top:-8px;bottom:-8px}.sci-famnow{position:absolute;top:4px;right:4px;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.9}.sci-famcap{margin:7px 0 0;font-size:11.5px;line-height:1.35;color:var(--sci-muted)}@media (max-width:359px){.sci-ltabs{gap:6px}.sci-ltl{gap:8px}.sci-ltab{font-size:13px}}.sci-famcap b{color:var(--sci-text);font-weight:700}.sci-famcap em{font-style:normal;font-weight:700;color:var(--sci-acc2)}.sci-none{display:flex;align-items:center;gap:8px;width:100%;margin:0 0 8px;padding:6px 4px;border:0;background:transparent;color:var(--sci-muted);font:13px/1.2 var(--sci-ff);cursor:pointer;text-align:left}.sci-none i{width:16px;height:16px;flex:none;border-radius:50%;border:2px solid var(--sci-line);box-sizing:border-box}.sci-none.on{color:var(--sci-text)}.sci-none.on i{border:5px solid var(--sci-acc)}.sci-tiles{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-bottom:6px}.sci-tile{position:relative;min-width:0;background:var(--sci-tile);border:1px solid var(--sci-line);border-radius:12px;padding:8px;cursor:pointer;outline:none;transition:transform .1s}.sci-tile:active{transform:scale(.985)}.sci-tile:focus-visible{box-shadow:0 0 0 3px var(--sci-accsoft)}.sci-tile.on{border:2px solid var(--sci-acc);padding:7px}.sci-ttop{display:flex;align-items:center;gap:7px;min-width:0}.sci-tth{width:26px;height:26px;flex:none;border-radius:8px;object-fit:cover;background:var(--sci-s2)}.sci-tc0{background:#9aa8f0}.sci-tc1{background:#f4a0ba}.sci-tc2{background:#8cc6f0}.sci-tc3{background:#f6cf7a}.sci-tc4{background:#c2b4ee}.sci-tc5{background:#9fe0c8}.sci-ttop b{font-size:13.5px;font-weight:700;color:var(--sci-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.sci-tsub{font-size:11px;color:var(--sci-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:5px 0 6px}.sci-tacts{display:flex;gap:4px}.sci-tbtn{flex:1;display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:28px;border:0;border-radius:8px;background:transparent;color:var(--sci-muted);cursor:pointer;padding:0}.sci-tbtn .sci-ic{width:15px;height:15px}.sci-tbtn:active{transform:scale(.94);background:var(--sci-accsoft)}.sci-tile.on .sci-tbtn{color:var(--sci-acc2)}.sci-tnew{display:flex;align-items:center;justify-content:center;gap:5px;min-height:92px;border:0;border-radius:12px;background:var(--sci-s2);color:var(--sci-acc2);cursor:pointer;font:700 13.5px/1.1 var(--sci-ff);padding:8px}.sci-tnew .sci-ic{width:16px;height:16px}.sci-plist{display:flex;flex-direction:column;gap:6px}.sci-prow{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 10px;background:var(--sci-tile);border:1px solid var(--sci-line);border-radius:12px;cursor:pointer;outline:none}.sci-prow.on{border:2px solid var(--sci-acc);padding:7px 7px 7px 9px}.sci-prow:focus-visible{box-shadow:0 0 0 3px var(--sci-accsoft)}.sci-prow .sci-tbtn{flex:none;width:30px}.sci-dot{width:16px;height:16px;flex:none;border-radius:50%;border:2px solid var(--sci-line);box-sizing:border-box}.sci-prow.on .sci-dot{border:5px solid var(--sci-acc)}.sci-pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.sci-pt b{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sci-pt span{font-size:11.5px;color:var(--sci-muted)}.sci-thumb0{display:flex;align-items:center;justify-content:center;color:var(--sci-muted)}@media (max-width:374px){.sci-head{gap:2px;padding-left:8px}.sci-logo{width:34px;height:34px;margin-right:2px}.sci-head>.sci-b{width:30px;height:30px}.sci-hpill{padding:0 6px;gap:2px}.sci-ttop{gap:5px}.sci-tth{width:22px;height:22px;border-radius:7px}}@media (max-width:339px){.sci-ttl{font-size:18px;letter-spacing:0}[data-sci-theme=\"glass\"] .sci-ttl{font-size:16px}.sci-tile{padding:7px}.sci-tile.on{padding:6px}}.sci-loading{margin:28px 0;text-align:center;color:var(--sci-muted);font-size:15px;opacity:0;animation:sci-in .2s ease-out .15s forwards}\n.sci-panelroot,.sci-card{all:initial;display:block;--sci-ff:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,system-ui,sans-serif;font-family:var(--sci-ff);font-size:14px;line-height:1.4;font-weight:400;color:var(--sci-text);text-align:left;-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}.sci-panelroot button,.sci-panelroot input,.sci-panelroot select,.sci-panelroot textarea,.sci-card button,.sci-card input,.sci-card select,.sci-card textarea{font-family:var(--sci-ff);letter-spacing:normal;text-transform:none;text-shadow:none}.sci-panelroot button,.sci-card button,.sci-panelroot [role=button]{touch-action:manipulation}.sci-panelroot,.sci-card{--sci-titlef:\"SciTitle\",var(--sci-ff);--sci-blur:none;--sci-glassline:transparent}[data-sci-theme=\"day\"]{color-scheme:light;--sci-bg:#ffffff;--sci-surface:#ffffff;--sci-tile:#ffffff;--sci-s2:#f4f5fd;--sci-line:#e3e6f6;--sci-text:#3f4689;--sci-muted:#8b8dab;--sci-acc:#6a7fd0;--sci-acc2:#5568c4;--sci-accsoft:#eef0ff;--sci-ontxt:#ffffff;--sci-danger:#e0566a;--sci-ok:#2f9e74;--sci-warn:#b26b00;--sci-shadow:0 12px 30px rgba(63,70,137,.16);--sci-title:#5f72c9;--sci-h3:#3f4689;--sci-tabon:#eef0ff;--sci-tabtx:#5568c4;--sci-glass:rgba(255,255,255,.9);--sci-glasstx:#5568c4;--sci-capt:#8f92ad;--sci-glassline:rgba(63,70,137,.08);--sci-busy:#f4f5fd;--sci-busyover:rgba(255,255,255,.5);--sci-bub-edge:rgba(106,127,208,.55);--sci-bub-tint:rgba(140,198,240,.3);--sci-spk1:#f4a0ba;--sci-spk2:#8cc6f0;--sci-spk3:#f2c46a}[data-sci-theme=\"night\"]{color-scheme:dark;--sci-bg:#1c2238;--sci-surface:#232a46;--sci-tile:#202842;--sci-s2:#262e4a;--sci-line:#2e3654;--sci-text:#e7eaf8;--sci-muted:#8f97bd;--sci-acc:#f4a0ba;--sci-acc2:#f7b6ca;--sci-accsoft:rgba(244,160,186,.15);--sci-ontxt:#1c2238;--sci-danger:#ff7a85;--sci-ok:#6fd6a3;--sci-warn:#f2c46a;--sci-shadow:0 14px 36px rgba(0,0,0,.45);--sci-title:#f2c46a;--sci-h3:#e7eaf8;--sci-tabon:rgba(244,160,186,.15);--sci-tabtx:#f7b6ca;--sci-glass:rgba(28,34,56,.86);--sci-glasstx:#f7b6ca;--sci-capt:#7d86ad;--sci-glassline:rgba(255,255,255,.07);--sci-busy:#1f2640;--sci-busyover:rgba(28,34,56,.45);--sci-bub-edge:rgba(255,255,255,.7);--sci-bub-tint:rgba(150,210,255,.22);--sci-spk1:#f4a0ba;--sci-spk2:#8cc6f0;--sci-spk3:#f2c46a}[data-sci-theme=\"bimbo\"]{color-scheme:light;--sci-bg:#fffaf6;--sci-surface:#ffffff;--sci-tile:#ffffff;--sci-s2:#fdeef2;--sci-line:#f3e3da;--sci-text:#5a4450;--sci-muted:#a68f99;--sci-acc:#f07399;--sci-acc2:#e05f86;--sci-accsoft:#fdeef2;--sci-ontxt:#ffffff;--sci-danger:#d8394b;--sci-ok:#3aa57a;--sci-warn:#c27c00;--sci-shadow:0 12px 30px rgba(171,120,110,.18);--sci-title:#ef7fa3;--sci-h3:#5a4450;--sci-tabon:#e8f2ff;--sci-tabtx:#5b93d8;--sci-glass:rgba(255,250,246,.9);--sci-glasstx:#e05f86;--sci-capt:#a68896;--sci-glassline:rgba(240,115,153,.12);--sci-busy:#fff3f6;--sci-busyover:rgba(255,250,246,.5);--sci-bub-edge:rgba(240,115,153,.55);--sci-bub-tint:rgba(191,220,255,.35);--sci-spk1:#ffb8c8;--sci-spk2:#8cc1ff;--sci-spk3:#ffd36e}[data-sci-theme=\"glass\"]{color-scheme:dark;--sci-bg:rgba(24,22,32,.74);--sci-surface:rgba(38,34,48,.94);--sci-tile:rgba(255,255,255,.06);--sci-s2:rgba(255,255,255,.07);--sci-line:rgba(255,255,255,.12);--sci-text:#f3f1f7;--sci-muted:rgba(243,241,247,.58);--sci-acc:#ffffff;--sci-acc2:#ffffff;--sci-accsoft:rgba(255,255,255,.13);--sci-ontxt:#1b1822;--sci-danger:#ff7d8a;--sci-ok:#7ee0b0;--sci-warn:#ffd27a;--sci-shadow:0 18px 44px rgba(0,0,0,.45);--sci-title:#ffffff;--sci-h3:rgba(243,241,247,.55);--sci-tabon:rgba(255,255,255,.14);--sci-tabtx:#ffffff;--sci-glass:rgba(20,18,26,.62);--sci-glasstx:#ffffff;--sci-capt:#8e8ea0;--sci-glassline:rgba(255,255,255,.14);--sci-busy:rgba(28,25,36,.86);--sci-busyover:rgba(20,18,26,.42);--sci-bub-edge:rgba(255,255,255,.7);--sci-bub-tint:rgba(255,255,255,.16);--sci-spk1:#ffffff;--sci-spk2:#e6e1f2;--sci-spk3:#cfc7e6;--sci-titlef:var(--sci-ff);--sci-blur:blur(18px) saturate(1.2)}@media (prefers-reduced-transparency:reduce){[data-sci-theme=\"glass\"]{--sci-bg:#1c1a24;--sci-blur:none}}@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){[data-sci-theme=\"glass\"]{--sci-bg:#1c1a24;--sci-blur:none}}.sci-ic{width:18px;height:18px;flex:none;display:block}.sci-b{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:var(--sci-muted);cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}.sci-b:active{transform:scale(.94)}.sci-b.sci-on{background:var(--sci-accsoft);color:var(--sci-acc2)}.sci-b.sci-off{opacity:.35;pointer-events:none}.sci-b.sci-danger{background:var(--sci-danger);color:#fff}.sci-pill{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 13px;border-radius:999px;border:1px solid transparent;background:var(--sci-acc);color:var(--sci-ontxt);font:600 13px/1 var(--sci-ff);cursor:pointer;-webkit-tap-highlight-color:transparent;white-space:nowrap}.sci-pill .sci-ic{width:16px;height:16px}.sci-pill:active{transform:scale(.97)}.sci-pill.sci-ghost{background:var(--sci-accsoft);color:var(--sci-acc2)}.sci-pill.sci-danger{background:var(--sci-danger);color:#fff}.sci-pill.sci-dangert{color:var(--sci-danger);background:transparent;border-color:var(--sci-line)}.sci-pill[disabled],.sci-pill.sci-wait{opacity:.55;pointer-events:none}.sci-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.sci-row.sci-end{justify-content:flex-end}.sci-hint{margin:6px 0 0;font-size:12px;line-height:1.45;color:var(--sci-muted)}.sci-ok{margin:8px 0 0;font-size:12px;line-height:1.4;color:var(--sci-ok)}.sci-warn{margin:8px 0 0;font-size:12px;line-height:1.4;color:var(--sci-warn)}.sci-bubbles{position:absolute;inset:0;overflow:hidden;pointer-events:none}.sci-bubbles i{position:absolute;bottom:-28px;border-radius:50%;background:radial-gradient(circle at 32% 30%,rgba(255,255,255,.95) 0,rgba(255,255,255,.5) 22%,var(--sci-bub-tint) 60%,rgba(150,210,255,.06) 100%);border:1px solid var(--sci-bub-edge);box-shadow:inset -2px -2px 5px rgba(120,190,255,.3);animation:sci-rise 3.6s cubic-bezier(.45,.05,.55,.95) infinite;will-change:transform,opacity}.sci-bubbles i:nth-child(1){left:8%;width:16px;height:16px;animation-duration:3.6s;animation-delay:-0.4s}.sci-bubbles i:nth-child(2){left:19%;width:10px;height:10px;animation-duration:3.0s;animation-delay:-1.7s}.sci-bubbles i:nth-child(3){left:30%;width:22px;height:22px;animation-duration:4.4s;animation-delay:-2.9s}.sci-bubbles i:nth-child(4){left:41%;width:12px;height:12px;animation-duration:3.2s;animation-delay:-0.9s}.sci-bubbles i:nth-child(5){left:52%;width:18px;height:18px;animation-duration:4.0s;animation-delay:-2.2s}.sci-bubbles i:nth-child(6){left:61%;width:9px;height:9px;animation-duration:2.7s;animation-delay:-0.2s}.sci-bubbles i:nth-child(7){left:70%;width:26px;height:26px;animation-duration:4.8s;animation-delay:-3.6s}.sci-bubbles i:nth-child(8){left:80%;width:12px;height:12px;animation-duration:3.3s;animation-delay:-1.3s}.sci-bubbles i:nth-child(9){left:88%;width:17px;height:17px;animation-duration:3.9s;animation-delay:-2.6s}.sci-bubbles i:nth-child(10){left:25%;width:8px;height:8px;animation-duration:2.6s;animation-delay:-1.1s}.sci-bubbles i:nth-child(11){left:46%;width:7px;height:7px;animation-duration:2.5s;animation-delay:-2.0s}.sci-bubbles i:nth-child(12){left:75%;width:9px;height:9px;animation-duration:2.8s;animation-delay:-0.6s}.sci-bubbles b{position:absolute;width:12px;height:12px;background:var(--sci-spk1);clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);opacity:.2;animation:sci-tw 2.2s ease-in-out infinite;will-change:transform,opacity}.sci-bubbles b:nth-of-type(1){left:12%;top:14%;animation-delay:-.2s}.sci-bubbles b:nth-of-type(2){left:80%;top:20%;width:9px;height:9px;background:var(--sci-spk2);animation-delay:-.9s}.sci-bubbles b:nth-of-type(3){left:33%;top:46%;width:15px;height:15px;background:var(--sci-spk3);animation-delay:-1.5s}.sci-bubbles b:nth-of-type(4){left:66%;top:58%;width:10px;height:10px;animation-delay:-.6s}.sci-bubbles b:nth-of-type(5){left:20%;top:72%;width:8px;height:8px;background:var(--sci-spk2);animation-delay:-1.2s}.sci-bubbles b:nth-of-type(6){left:52%;top:10%;width:11px;height:11px;background:var(--sci-spk3);animation-delay:-1.8s}@keyframes sci-rise{0%{transform:translate3d(0,0,0) scale(.55);opacity:0}12%{opacity:1}35%{transform:translate3d(7px,-170px,0) scale(.85)}65%{transform:translate3d(-6px,-320px,0) scale(1)}92%{opacity:.9}100%{transform:translate3d(4px,-480px,0) scale(1.05);opacity:0}}@keyframes sci-tw{0%,100%{opacity:.2;transform:scale(.7) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(20deg)}}@media (prefers-reduced-motion:reduce){.sci-bubbles i{animation:none;opacity:.5;bottom:20%}.sci-bubbles b{animation:none;opacity:.6}}.sci-card{position:relative;display:block;max-width:440px;margin:12px 0 2px;padding:0;background:none;border:0}.sci-media{position:relative;width:100%;min-height:120px;border-radius:14px;overflow:hidden;background:var(--sci-busy);box-sizing:border-box}.sci-img{display:block;width:100%;height:100%;object-fit:cover;cursor:zoom-in}.sci-missing .sci-img{display:none}.sci-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--sci-muted);font-size:12px;padding:16px;text-align:center}.sci-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px 16px 56px;text-align:center}.sci-draw{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:0;background:var(--sci-acc);color:var(--sci-ontxt);font:600 14px/1 var(--sci-ff);cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.14)}.sci-draw:active{transform:scale(.97)}.sci-pv{font-size:11.5px;line-height:1.4;color:var(--sci-muted);max-width:92%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.sci-busy{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;background:var(--sci-busy)}.sci-busy.sci-over{background:var(--sci-busyover)}.sci-st{position:relative;z-index:1;font-size:12.5px;font-weight:600;color:var(--sci-glasstx);background:var(--sci-glass);padding:5px 12px;border-radius:999px;white-space:nowrap}.sci-bar{position:absolute;z-index:3;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:var(--sci-glass);box-shadow:0 2px 10px rgba(0,0,0,.16),inset 0 0 0 1px var(--sci-glassline);max-width:calc(100% - 20px)}.sci-bar .sci-b{width:38px;height:34px;flex:none;border-radius:999px;background:transparent;color:var(--sci-glasstx)}.sci-bar .sci-b .sci-ic{width:18px;height:18px}.sci-bar .sci-b.sci-on{background:var(--sci-acc);color:var(--sci-ontxt)}.sci-bar .sci-b.sci-danger{background:var(--sci-danger);color:#fff}.sci-nav{position:absolute;z-index:3;top:50%;width:38px;height:38px;margin-top:-19px;border-radius:50%;background:var(--sci-glass);color:var(--sci-glasstx);box-shadow:0 2px 10px rgba(0,0,0,.16),inset 0 0 0 1px var(--sci-glassline)}.sci-nav.sci-prev{left:8px}.sci-nav.sci-next{right:8px}.sci-nav .sci-ic{width:20px;height:20px}.sci-nav.sci-off{visibility:hidden}.sci-lab{display:flex;margin:6px 4px 0;font-size:12px;line-height:1.3;color:var(--sci-capt);white-space:nowrap}.sci-labs{min-width:0;overflow:hidden;text-overflow:ellipsis}.sci-labn{flex:none;white-space:pre}.sci-card[data-sci-chat=\"light\"] .sci-lab{color:#777a92}.sci-card[data-sci-chat=\"dark\"] .sci-lab{color:#8e91a8}.sci-lab.sci-labwarn{font-weight:600;color:var(--sci-danger)}.sci-card[data-sci-chat=\"light\"] .sci-lab.sci-labwarn{color:#c8364a}.sci-card[data-sci-chat=\"dark\"] .sci-lab.sci-labwarn{color:#ff8f9a}.sci-err,.sci-box,.sci-save{margin-top:8px;padding:10px 12px;border-radius:12px;background:var(--sci-surface);border:1px solid var(--sci-line);color:var(--sci-text)}.sci-err{font-size:12.5px;color:var(--sci-danger)}.sci-err .sci-row{margin-top:8px}.sci-lbl{font-size:11.5px;color:var(--sci-muted);margin-bottom:4px}.sci-ta{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--sci-line);background:var(--sci-s2);color:var(--sci-text);font:12px/1.45 ui-monospace,Menlo,monospace;padding:8px;resize:vertical}.sci-sel{border-radius:8px;border:1px solid var(--sci-line);background:var(--sci-s2);color:var(--sci-text);padding:5px 8px;font:13px/1.3 var(--sci-ff)}.sci-kv{display:flex;justify-content:space-between;gap:12px;font-size:12px;padding:3px 0;color:var(--sci-muted)}.sci-kv b{color:var(--sci-text);font-weight:600;text-align:right;word-break:break-all}.sci-det{margin-top:6px}.sci-det summary{cursor:pointer;font-size:12px;color:var(--sci-acc2)}.sci-code{margin-top:6px;white-space:pre-wrap;word-break:break-word;font:11px/1.45 ui-monospace,Menlo,monospace;color:var(--sci-muted);background:var(--sci-s2);border-radius:8px;padding:8px;max-height:220px;overflow:auto}.sci-save{display:flex;flex-wrap:wrap;gap:8px}.sci-save .sci-lbl{width:100%;margin:0}@media (max-width:359px){.sci-bar .sci-b{width:34px}.sci-nav{width:34px;height:34px;margin-top:-17px}}\n/* Shark Image ST — акулья гамма поверх темы таверны */\n.shk-ver { opacity: .55; font-size: .85em; font-weight: 400; }\n.shk-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 10px; }\n.shk-tab { flex: 1 1 22%; margin: 0; padding: 7px 4px; text-align: center; font-size: .9em; white-space: nowrap; }\n.shk-tab.active { background: rgba(90,200,250,.25); border-color: rgba(90,200,250,.65); font-weight: 700; }\n.shk-body { display: flex; flex-direction: column; gap: 2px; }\n.shk-body hr { width: 100%; opacity: .3; margin: 8px 0; }\n.shk-note { font-size: .84em; opacity: .78; margin: 6px 0; line-height: 1.45; }\n.shk-note code { background: rgba(128,128,128,.18); padding: 1px 5px; border-radius: 5px; }\n.shk-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 4px 0; }\n.shk-row > label { flex: 0 0 132px; font-size: .9em; opacity: .85; }\n.shk-row > select, .shk-row > input[type=\"text\"], .shk-row > input[type=\"password\"], .shk-row > input[type=\"number\"], .shk-row > textarea { flex: 1 1 150px; width: auto; min-width: 0; }\n.shk-row > input[type=\"checkbox\"] { flex: 0 0 auto; width: 18px; height: 18px; }\n.shk-row3 { display: flex; gap: 10px; flex-wrap: wrap; }\n.shk-row3 .shk-row { flex: 1 1 30%; min-width: 180px; }\n.shk-row3 .shk-row > label { flex: 1 1 100%; }\n.shk-ta { width: 100%; box-sizing: border-box; font-size: .85em; line-height: 1.4; }\n.shk-mini { padding: 5px 10px; margin: 0; white-space: nowrap; font-size: .88em; }\n.shk-danger { background: rgba(200,60,90,.16); border-color: rgba(200,60,90,.5); }\n.shk-mbtns { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }\n.shk-sech { font-weight: 700; margin: 10px 0 4px; color: #6fd3f7; }\n.shk-kind { opacity: .6; font-size: .84em; }\n.shk-auto { cursor: help; }\n.shk-look, .shk-conn { border: 1px solid var(--SmartThemeBorderColor, #555); border-radius: 12px; padding: 8px 10px; margin: 8px 0; }\n.shk-lookh { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }\n.shk-lookh .shk-mini { margin-left: auto; padding: 2px 8px; }\n\n/* полоска под сообщением */\n.shk-bar { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; margin: 8px 0 4px; }\n.shk-bar .menu_button { margin: 0; padding: 6px 11px; font-size: .9em; white-space: nowrap; border-radius: 14px; display: inline-block; width: auto !important; }\n.shk-bar .shk-main { background: rgba(90,200,250,.18); border-color: rgba(90,200,250,.6); }\n.shk-bar .shk-stop { background: rgba(200,60,90,.2); }\n.shk-stage { flex: 1 1 100%; text-align: center; font-size: .9em; opacity: .9; }\n.shk-timer { opacity: .7; margin-left: 4px; }\n.shk-nav { display: flex; align-items: center; gap: 6px; }\n.shk-nav span { opacity: .85; font-size: .9em; }\n.shk-err { flex: 1 1 100%; padding: 8px 10px; border-radius: 10px; background: rgba(200,60,90,.14); border: 1px solid rgba(232,136,168,.5); font-size: .88em; }\n.shk-hidden-marker { display: none; }\n\n/* окна */\n.shk-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10050; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }\n.shk-modal { width: min(560px, 100%); min-width: 260px; max-height: 90vh; max-height: 90dvh; overflow: auto; background: var(--SmartThemeBlurTintColor, #222); color: var(--SmartThemeBodyColor, #eee); border: 1px solid rgba(90,200,250,.5); border-radius: 16px; padding: 14px; box-sizing: border-box; backdrop-filter: blur(var(--SmartThemeBlurStrength, 10px)); display: flex; flex-direction: column; align-items: stretch; gap: 6px; }\n.shk-modal > * { max-width: 100%; box-sizing: border-box; }\n.shk-mh { font-weight: 700; margin-bottom: 4px; color: #6fd3f7; }\n.shk-modal .menu_button { margin: 0; padding: 10px; text-align: center; box-sizing: border-box; }\n.shk-mbtns .menu_button { flex: 1 1 auto; }\n.shk-mrow { font-size: .86em; opacity: .8; }\n.shk-mrow code { background: rgba(128,128,128,.18); padding: 1px 5px; border-radius: 5px; }\n.shk-info { font-size: .86em; line-height: 1.5; display: flex; flex-direction: column; gap: 6px; }\n.shk-infop { background: rgba(128,128,128,.1); border-radius: 8px; padding: 6px 8px; overflow-wrap: anywhere; }\n\n.shk-always{border:1px solid rgba(128,128,128,.25);border-radius:8px;margin:6px 0}\n.shk-always-head{padding:6px 10px;background:rgba(128,128,128,.12);border-bottom:1px solid rgba(128,128,128,.25)}\n.shk-always-body{padding:8px}\n\n#shk_tb{cursor:pointer;font-size:1.15em;padding:0 8px;opacity:.9}\n#shk_tb:hover{opacity:1}\n#shk_modal{position:fixed;inset:0;z-index:9999}\n.shk-modal-bg{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}\n.shk-modal{width:min(600px,95vw);max-height:85vh;display:flex;flex-direction:column;background:var(--SmartThemeBlurTintColor,#202024);border:1px solid rgba(128,128,128,.35);border-radius:10px;box-shadow:0 8px 30px #000}\n.shk-modal-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(128,128,128,.25)}\n.shk-modal-head b{flex:1}\n.shk-modal-body{overflow-y:auto;padding:10px}\n\n/* плавающая кнопка Sharky (перекрывает старое правило) */\n#shk_tb{position:fixed !important;left:10px !important;bottom:120px !important;top:auto !important;width:44px;height:44px;border-radius:50%;background:rgba(30,30,34,.92);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.5);user-select:none;-webkit-user-select:none;z-index:10000}\n#shk_tb:active{transform:scale(.92)}\n\n/* запасное отображение картинки (если нет нативных media) */\n.shk2-img{margin:8px 0}\n.shk2-fallback-img{max-width:min(100%,520px);border-radius:10px;display:block}\n\n\n/* совместимость с Таверной */\n#shk_tb{right:14px;bottom:110px;font-size:30px;line-height:1;z-index:10000;filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))}\n#shk_modal{z-index:10001}\n.sci-galgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}\n.sci-galimg{width:100%;border-radius:10px;cursor:pointer;aspect-ratio:1;object-fit:cover;background:var(--sci-s2)}\n.sci-ticon{font-size:15px;line-height:1}\n.sci-logo{font-size:30px;display:flex;align-items:center;justify-content:center}\n.sci-sheet .shk-mbtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}\n.sci-sheet .shk-ta{resize:vertical}\n.sci-sheet .shk-conn{border-top:1px solid var(--sci-line);padding-top:8px;margin-top:8px}\n.sci-sheet .shk-look .sci-name{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}\n/* финальная совместимость порта: не искажаем оригинальные sci-стили */\n#shk_tb.sci-fab{left:auto!important;right:14px;bottom:110px;top:auto;width:54px;height:54px;padding:0;border:0;background:transparent;box-shadow:none;font-size:inherit;line-height:1;filter:none}\n#shk_tb.sci-fab .sci-fabimg{width:54px;height:54px}\n.sci-card.shk-card{margin:8px 0}\n.sci-card .sci-img{max-width:none;border-radius:0}\n.shk-tavo-card .mes_media_wrapper{display:none}\n.sci-sheet .shk-look{border:0;background:transparent;padding:0}\n.sci-panelroot button:focus-visible,.sci-card button:focus-visible{outline:2px solid var(--sci-acc);outline-offset:2px}\n.sci-panelroot .sci-b{position:relative}\n.sci-panelroot .sci-b::after{content:'';position:absolute;inset:-4px;border-radius:inherit}\n.sci-card .sci-media .sci-err{position:relative;z-index:4}\n@media(max-width:374px){#shk_tb.sci-fab{right:10px;bottom:100px}.sci-head{gap:2px}}\n";
            document.head.appendChild(st);
        } catch (e) { console.warn('[sharky4] css', e); }
    })();
    const ctxOk = () => { try { const c = ctx(); return !!(c && c.extensionSettings !== undefined && c.chat); } catch (e) { return false; } };
    const c = () => ctx();

    // ---------------------------------------------------------------- мелкие хелперы
    const l = (v) => (v === null || v === undefined ? '' : String(v));
    const esc = (s) => l(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const uid = () => 'shk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = () => Date.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const clamp = (v, d, a, b) => { let x = parseFloat(v); if (!isFinite(x)) x = d; if (a !== undefined && x < a) x = a; if (b !== undefined && x > b) x = b; return x; };
    const ival = (v, d, a, b) => Math.round(clamp(v, d, a, b));
    const deep = (o) => { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } };
    const jparse = (s) => { if (s && typeof s === 'object') return s; if (typeof s === 'string' && s) { try { const o = JSON.parse(s); if (o && typeof o === 'object') return o; } catch (e) { } } return null; };
    const fnv = (s) => { let h = 2166136261; s = l(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const h36 = (s) => fnv(s).toString(36);
    const wsp = (s) => l(s).replace(/\s+/g, ' ').replace(/(\s*,\s*)+/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '');
    const cut = (s, n) => { s = l(s); if (s.length <= n) return s; let x = s.slice(0, n); const i = x.lastIndexOf(','); return (i > 0.5 * n ? x.slice(0, i) : x).replace(/[\s,]+$/, ''); };
    const isHttps = (u) => /^https:\/\//i.test(l(u).trim());
    const mkErr = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

    // нормализация и слияние тегов
    const w = wsp;
    const xmerge = (a, b) => { a = w(a); b = w(b); if (!b) return a; if (!a) return b; const n = {}; a.split(',').forEach((t) => { n[t.trim().toLowerCase()] = 1; }); const r = b.split(',').map((t) => t.trim()).filter((t) => t && !n[t.toLowerCase()]); return r.length ? a + ', ' + r.join(', ') : a; };
    const TEXT_RX = /(^|[,\n]\s*)text\s*:/i;
    const E = (s) => { s = l(s); const m = TEXT_RX.exec(s); if (!m) return { tags: s, text: '' }; const tags = s.slice(0, m.index).replace(/[\s,]+$/, ''); const text = s.slice(m.index + m[0].length).replace(/^[\s,]+|[\s,]+$/g, ''); if (text.length > 140) return { tags: [tags, text].filter(Boolean).join(', '), text: '' }; if (/[Ѐ-ӿ]/.test(text)) return { tags, text: '' }; return { tags, text }; };
    const O = (tags, text) => { text = l(text).replace(/[\[\]|]/g, ' ').replace(/\s+/g, ' ').trim(); tags = l(tags).replace(/[\s,]+$/, ''); return text ? (tags ? tags + ', ' : '') + 'Text: ' + text : tags; };
    const I = (tags, add) => { const e = E(tags); return O(xmerge(e.tags, add), e.text); };
    const hasText = (s) => { const t = E(s); return !!t.text || /(^|,)\s*(speech bubble|thought bubble|sound effects|english text)\s*(,|$)/i.test(t.tags); };
    const normTag = (s) => l(s).toLowerCase().replace(/^\s*-?\d*\.?\d+::/, '').replace(/::\s*$/, '').replace(/[{}\[\]()]/g, '').replace(/\s+/g, ' ').trim();
    const NO_TEXT_TAGS = { text: 1, 'english text': 1, 'speech bubble': 1, 'thought bubble': 1, 'sound effects': 1, onomatopoeia: 1 };
    const COMIC_RX = /(^|,)\s*(comic|comic page|4koma|2koma|sticker sheet|splash page|\d+ (panels|stickers|frames))\s*(,|$)/i;
    const MULTI_RX = { 'multiple views': 1, 'multiple panels': 1, panels: 1, comic: 1, '4koma': 1, '2koma': 1, 'split screen': 1, sticker: 1, stickers: 1 };
    // негатив: убрать теги, которые уже есть в промпте (и лишнее для комиксов/текста)
    function negFilter(neg, promptTags, charTags) {
        const p = E(promptTags), a = {}, multi = COMIC_RX.test(p.tags);
        const have = [p.tags].concat(charTags || []).join(',').split(',').forEach((t) => { const n = normTag(t); if (n) a[n] = 1; });
        const hasT = hasText(promptTags);
        return l(neg).split(',').filter((t) => { const n = normTag(t); return n && !a[n] && !(hasT && NO_TEXT_TAGS[n]) && !(multi && MULTI_RX[n]); }).map((t) => t.trim()).join(', ');
    }

    // ---------------------------------------------------------------- отладочные плашки
    function bootLog(msg) {
        try {
            if (typeof toastr !== 'undefined') { toastr.info(msg, '🦈 Sharky ' + VER); return; }
            const d = document.createElement('div');
            d.textContent = '🦈 ' + msg;
            d.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:#5b2a86;color:#fff;padding:8px 12px;border-radius:8px;font:13px monospace;box-shadow:0 2px 8px #000';
            document.body.appendChild(d);
            setTimeout(() => d.remove(), 15000);
        } catch (e) { console.log('[sharkimage boot]', msg, e); }
    }
    function bootErr(where, e) {
        bootLog('ОШИБКА в ' + where + ': ' + (e && e.message ? e.message : e));
        console.error('[sharkimage]', where, e);
    }
    bootLog('скрипт прочитан, v' + VER);

    // ---------------------------------------------------------------- конфигурация
    const DEF = {
        v: 1,
        mode: 'auto',            // auto | manual | off
        writer: 'inline',        // inline | api
        apiId: '',
        promptId: 'p_scene',
        promptIdV4: 'p_v4',
        ctxN: 4,
        refs: true,
        memo: true,
        provider: 'nai',         // nai | naiproxy | naistera
        nai: { model: 'nai-diffusion-5-full', size: 'normal', quality: 'standard', uc: 'heavy', steps: 28, scale: 5, sampler: 'k_euler_ancestral', noise: 'karras' },
        ns: { model: 'novelai-v4.5', quality: 'standard', cat: [] },
        proxy: { url: '', sendTok: false },
        styleId: 's_std',
        styleIdV4: 's_std4',
        negId: 'n_basic',
        negIdV4: 'n_basic4',
        naiToken: '',
        nsToken: '',
        api: { list: [] },
        theme: 'auto',
        lang: 'ru',
        fabPos: null,
    };

    const DEF_LIB = {
        styles: [
            { id: 's_std', name: 'Стандарт (V5)', tags: 'masterpiece, best quality, highly detailed, very aesthetic, absurdres', img: '', fam: 'v5' },
            { id: 's_std4', name: 'Стандарт (V4)', tags: 'masterpiece, best quality, very aesthetic, absurdres, highly detailed, sharp focus', img: '', fam: 'v4' },
            { id: 's_mix4', name: 'Микс художников (V4)', tags: '[0.6::lart_art1 ::, 1.6::zero_q_0q::, 0.7::etceteraart::, 1.3::dang0_23 ::, 0.9::sasha_chii::, realistic, highres_quality, ultra_detail, sidelighting, volumetric_shadow, nyantcha, 1.5::obj Shep::, 0.6::kagoya1219 ::, 1.8::pigeon666 ::, 0.7::96yottea::, 0.8::aoma xuanzexuexi::, 0.5::vlfdus 0 ::].', img: '', fam: 'v4' },
        ],
        negs: [
            { id: 'n_basic', name: 'Базовый (V5)', text: 'bad anatomy, bad hands, extra fingers, fewer fingers, missing fingers, fused fingers, extra limbs, extra arms, extra legs, malformed limbs, deformed, bad proportions, long neck, cross-eyed, watermark, signature', fam: 'v5' },
            { id: 'n_basic4', name: 'Базовый (V4)', text: 'bad anatomy, bad hands, extra fingers, fewer fingers, missing fingers, fused fingers, extra limbs, extra arms, extra legs, malformed limbs, deformed, bad proportions, long neck, cross-eyed, watermark, signature', fam: 'v4' },
        ],
        prompts: [
            { id: 'p_scene', name: 'Сцена (V5)', kind: 'scene', text: '', builtin: 1 },
            { id: 'p_comic', name: 'Комикс / манга', kind: 'comic', text: '', builtin: 1 },
            { id: 'p_marvel', name: 'Супергеройский комикс', kind: 'custom', text: '', builtin: 1 },
            { id: 'p_chibi', name: 'Чиби-страница', kind: 'custom', text: '', builtin: 1 },
            { id: 'p_v4', name: 'Сцена NovelAI V4 / Naistera', kind: 'v4', text: '', builtin: 1 },
        ],
    };
    // ---------------------------------------------------------------- шаблоны промптов (из оригинального плагина)
    const TPL = {
        scene: "SCENE IMAGE — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16.\n- PROMPT is ONE line of English NovelAI / Danbooru tags: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nWHAT TO DRAW\n- The CURRENT moment of the story: who is visible, what they do, their expressions, clothing in its current state, place, time of day, weather, key props.\n- Never invent events, people or objects; fill gaps only with the minimum that fits.\n- Character profiles and the CHARACTERS list define looks; the latest story text defines action, mood and the state of clothing.\n\nRATIO\n2:3 portrait, one or two people from the waist up; 9:16 one standing figure in full body; 3:2 two or three people, rooms, action; 16:9 landscapes, crowds, wide action; 1:1 one centered subject or a close-up.\n\nSTRUCTURE\nGLOBAL | CHARACTER 1 | CHARACTER 2 ...\nGLOBAL, in this order:\n1. Count tags for visible characters only, each a separate tag: 1girl; 1boy, 1girl; 2girls; 2boys, 1girl (no reflections, photos or statues).\n2. Shot, 1-2 tags: close-up, portrait, upper body, cowboy shot, full body, wide shot, from above, from below, from side, from behind, dutch angle.\n3. Place, 2-5 concrete tags: indoors, cafe, wooden table, window, rain, forest, city street, night.\n4. Light, 1-2 tags from the scene: sunlight, window light, sunset, moonlight, candlelight, neon lights, dim lighting, backlighting, rim light, dramatic shadows.\n5. Color, exactly 1 tag matching light and mood: warm colors, cool colors, muted colors, pastel colors, high contrast. A moonlit night is never warm colors.\nNo hair, eyes, body or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per visible character, max 6; extra people go into GLOBAL as crowd or background people.\nOrder inside a block: @Name, girl or boy, position, appearance, clothing, pose, action, expression, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- girl or boy without numbers, then position: left side, right side, center, foreground, background.\n- Appearance: hair color, hair length, hairstyle, eye color, body type, skin tone, notable features. If the CHARACTERS list gives appearance or outfit tags, copy them exactly and never contradict them.\n- Clothing exactly as it is now (wet, torn, unbuttoned, taken off) with colors.\n- Franchise character: Name (series) right after girl or boy, plus the full appearance anyway.\n- Contact uses raw prefixes in each owner block: source#hug and target#hug, mutual#kissing, source#holding hands.\n- Never merge two people into one block; never give one person the traits or clothes of another.\n\nGAZE\nEyes stay inside the scene: looking at another, looking at object, looking down, looking away, closed eyes. Use looking at viewer only when a character addresses the reader or the scene is pov.\n\nTEXT\nNo lettering: no speech bubbles, no captions, no readable signs.\n\nADULTS AND NSFW\n- Everyone is an adult: never childlike tags, never ages or heights.\n- Only when the current moment explicitly contains sex or nudity: add nsfw, explicit, uncensored to GLOBAL and describe the established position, contact and clothing state with plain Danbooru tags in the owners blocks. Never go beyond the story; romance, kissing or closeness alone are not sexual.\n\nFORM\nShort Danbooru tags of 1-3 words separated by commas, no sentences. 350-800 characters. If it gets longer, drop background tags first, never appearance.\n\nExample, the very last line of a reply:\n[SCENE: 3:2 | 1boy, 1girl, upper body, indoors, cafe, wooden table, rain on window, window light, cool colors | @Kai, boy, left side, short black hair, grey eyes, slim, white shirt, rolled sleeves, elbow on table, chin rest, smile, looking at another | @Mira, girl, right side, long brown hair, blue eyes, green dress, holding cup, blush, looking at another]",
        comic: "MANGA / MANHWA COMIC PAGE — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16 (pick it in step 2).\n- PROMPT is ONE line in English: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nSTEP 1. READ THE BEAT (silently, never write it in the reply)\nDecide which beat the current moment is: dialogue, tension, action, romance, comedy, reveal, flashback or quiet mood. Draw only what the story established; never invent events, powers, people or lines. Character profiles and the CHARACTERS list define looks; the latest story text defines action and the state of clothing.\n\nSTEP 2. PICK RATIO AND LAYOUT\nMatch the beat and keep pages varied. If a PREVIOUS IMAGE line is given, do not repeat its ratio and layout unless only that one fits the beat.\n- dialogue: 2:3, 3-4 panels; top wide panel shows the place, then alternating close-ups, a reaction close-up at the bottom.\n- tension, confrontation: 2:3 or 9:16, 3 panels; slanted panel borders, extreme close-up of eyes, shadow over eyes, black gutters.\n- action, fight, chase: 3:2 or 16:9 spread, or 2:3; 2-4 diagonal panels, a character breaking the panel border, speed lines, impact frame, motion blur.\n- romance, tender moment: 2:3 or 9:16, 3 panels; borderless panels, soft focus, close-up of hands, sparkles, floating petals or light particles.\n- comedy, gag: 9:16 4koma with four equal panels stacked, or 1:1 2x2 panel grid, or 2:3 with ONE chibi inset reaction; sweatdrop, flying sweatdrops, shocked face.\n- reveal, climax: 2:3 splash page; one huge panel plus 1-2 small inset panels in the corners, emphasis lines.\n- slow buildup, manhwa scroll: 9:16, 3 panels stacked vertically, no panel borders, wide white gaps between panels.\n- flashback: one desaturated panel with blurred edges inside any layout, black gutters around it.\n- quiet atmosphere, travel: 16:9 or 3:2, one wide cinematic panel plus one small close-up inset.\nAlways 2-5 panels. Name each panel by its position (top panel, middle left panel, bottom right panel, inset panel) and give it a shot: wide shot, medium shot, close-up, extreme close-up, from above, from below, over the shoulder, dutch angle.\n\nSTEP 3. ADD EFFECTS\n2-4 effects that fit the beat, each tied to its panel: speed lines, motion lines, emphasis lines, impact, shockwave, screentone, sparkles, light particles, floating petals, shaded face, shadow over eyes, sweatdrop, anger vein, blush, trembling, heart, dramatic shadows, rim light, lens flare, motion blur.\n\nGLOBAL SECTION, in this order\ncount tags of visible characters, each a separate tag (1girl; 1boy, 1girl; 2girls), comic, number of panels, layout and gutters, every panel with position + shot + who + what happens, effects, place, 1-2 lighting tags, 1 color tag (warm colors, cool colors, muted colors, pastel colors, high contrast, desaturated), bubble placement, and LAST the Text: part.\nInside GLOBAL call people by gender and side (the girl on the left, the man), never by name. No hair, eyes or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per visible character, max 6. Order inside a block: @Name, girl or boy, position, appearance, current clothing, actions and expressions per panel, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- Appearance: hair color and length, hairstyle, eye color, body type, skin tone, notable features. If the CHARACTERS list gives appearance or outfit tags, copy them exactly.\n- A character seen in several panels keeps ONE block that lists the panel actions (top panel smiling, bottom panel crying).\n- Contact uses raw prefixes in each owner block: source#hug and target#hug, mutual#kissing.\n- Franchise character: Name (series) right after girl or boy, plus the full appearance anyway.\n- Never merge two people into one block; never give one person the traits or clothes of another.\n- Gaze stays inside the story: looking at another, looking at object, looking away. No looking at viewer unless a character addresses the reader.\n\nSPEECH BUBBLES AND TEXT\nNovelAI draws only Latin letters: Russian turns into scribbles, and every tag written after the lettering gets drawn as letters too.\n- At most 2 speech bubbles per page plus at most 1 sound effect.\n- Bubble text is a short ENGLISH translation of a real line from the current moment: max 5 words per bubble, UPPERCASE, no names. Never invent lines; a silent moment gets no bubbles.\n- In GLOBAL say where each bubble is: speech bubble in the top panel, tail pointing to the girl on the left. Thought bubble only for established inner thoughts.\n- All lettering goes into ONE Text: part at the very END of GLOBAL, right before the first |, for example Text: YOU CAME BACK. Never write text: inside a character block.\n- No dialogue: no bubble tags and no Text: part.\n\nCHIBI\nAt most one small chibi inset per page, only for a comedy reaction; never in tense, sad or adult scenes.\n\nADULTS AND NSFW\n- Everyone is an adult: never childlike tags, never ages or heights.\n- Only when the current moment explicitly contains sex: add nsfw, explicit, uncensored to GLOBAL. Keep exactly the established explicitness, never escalate, never infer it from romance, kissing or nudity alone.\n- Plain Danbooru terms for the established act, position, contact and clothing state (naked, clothes pulled down, shirt lifted), tied to the panels where they are visible. A tiny contact point may get one close-up inset; an established hidden penetration may get one small x-ray inset. Anatomy and clothing state stay the same in every panel.\n\nFORM\nShort tags and panel phrases of up to 10 words, separated by commas, no full sentences. The whole PROMPT is 500-1300 characters; if it gets longer, shorten panel phrases and background first, never appearance or the Text: part.\n\nCHECK SILENTLY BEFORE WRITING\nOne line at the very end; the ratio is allowed and fits the layout; 2-5 panels with positions and shots; the layout differs from the PREVIOUS IMAGE when possible; lighting and color present; one block per person; at most 2 bubbles of short English UPPERCASE text; Text: is the last part of GLOBAL; no names, quotation marks or brackets.\n\nExample, dialogue beat:\n[SCENE: 2:3 | 1boy, 1girl, comic, 4 panels, white gutters, top panel wide shot of a rainy night street, middle left panel close-up of the girl on the left, middle right panel close-up of the man, bottom panel extreme close-up of his eyes, emphasis lines, rain, street lights, cool colors, speech bubble in the middle left panel, tail pointing to the girl, Text: YOU CAME BACK | @Mira, girl, left side, long silver hair, blue eyes, slim, pale skin, black coat, middle left panel teary eyes, looking at another | @Kai, boy, right side, short black hair, grey eyes, tall, dark hoodie, middle right panel surprised, bottom panel narrowed eyes, looking at another]\n\nExample, action beat:\n[SCENE: 3:2 | 1boy, 1girl, comic, 3 panels, diagonal panel borders, left panel full body of the man leaping from a rooftop, from below, speed lines, top right panel close-up of the girl shouting, bottom right panel impact frame of his landing, shockwave, flying debris, night city, neon lights, high contrast, speech bubble in the top right panel, tail pointing to the girl, sound effects, Text: JUMP NOW! CRASH | @Kai, boy, center, short black hair, grey eyes, black jacket, left panel leaping, bottom right panel landing on one knee, determined expression | @Mira, girl, right side, long silver hair, blue eyes, white coat, top right panel shouting, reaching out, looking at another]",
        marvel: "SUPERHERO ACTION COMIC PAGE — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16 (pick it in step 1).\n- PROMPT is ONE line in English: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist, franchise or publisher names, or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nTHE FEEL\nLoud, kinetic American superhero comic energy: extreme angles and foreshortening, splash panels, tilted and overlapping panels, figures bursting out of panel borders, big sound effects, impact bursts, halftone dots, hard shadows, saturated high contrast color.\nThe energy comes from camera, panel shapes and effects. Never invent powers, villains, explosions or fights the story does not have, and never add costumes, capes or masks that were not established. A quiet talk still gets low angles, close-ups and hard light, but no explosions.\n\nSTEP 1. BEAT TO RATIO AND LAYOUT (decide silently, never write it in the reply)\nMatch the beat and keep pages varied. If a PREVIOUS IMAGE line is given, do not repeat its ratio and layout unless only that one fits the beat.\n- big moment (hit, jump, crash, transformation, entrance): 2:3 splash page; one full-page panel, the figure bursting out of the panel border, 1-2 small inset panels with reactions.\n- fight or chase: 2:3 or 3:2; 3-5 staggered panels with diagonal borders, the last panel the biggest.\n- wide clash, destroyed street, crowd: 16:9; one widescreen panel on top and 2 small panels below.\n- fall, flight, climb, tall building: 9:16; one tall panel seen from below or from above.\n- standoff: 2:3; three thin vertical panels with extreme close-ups of eyes and hands, then one wide panel.\n- dialogue or plan: 2:3 or 1:1; 3-4 panels, low angle close-ups, rim light, one silhouette panel.\n- emotional peak: 2:3; one big close-up panel with heavy shadows plus a small inset.\n1-5 panels. Every panel gets position + shot (extreme close-up, close-up, medium shot, full body, wide shot) + angle (from below, from above, dutch angle, foreshortening, over the shoulder).\n\nSTEP 2. EFFECTS\n3-5 effects, only for what really happens:\n- motion: speed lines, motion lines, motion blur, afterimage\n- impact: impact burst, shockwave, flying debris, cracked ground, dust cloud, sparks, shattered glass\n- energy, only if the story has powers or magic: glowing aura, energy beam, crackling energy, lightning, glowing eyes\n- atmosphere: halftone, hard shadows, rim light, backlighting, lens flare, smoke; explosion only when something explodes\n- color: high contrast plus one of saturated colors, red and blue tones, warm tones, cold tones\n\nGLOBAL SECTION, in this order\ncount tags of visible characters, each a separate tag (1boy; 1boy, 1girl; 2boys), comic, number of panels, layout, every panel with position + shot + angle + who + action, effects, place, 1-2 lighting tags, color tags, lettering placement, and LAST the Text: part.\nInside GLOBAL call people by gender and side (the man on the left), never by name. No hair, eyes or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per visible character, max 6. Order inside a block: @Name, girl or boy, position, appearance, current clothing, dynamic pose and action per panel, expression, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- Appearance: copy the CHARACTERS tags exactly; otherwise hair color and length, hairstyle, eye color, body type, skin tone, notable features.\n- Poses only from the story: dynamic pose, mid-air, leaping, punching, kicking, landing on one knee, running, aiming, shielding face, clenched fist, arms crossed.\n- One block per person even across panels; never merge people or swap traits.\n- Gaze stays inside the scene: looking at another, looking at object, looking up. No looking at viewer unless a character addresses the reader.\n\nLETTERING\nNovelAI draws only Latin letters, and every tag written after the lettering gets drawn as letters too.\n- One big English sound effect in UPPERCASE that matches the action (WHAM, BOOM, KRAK, THWIP, CRASH, BAM; SHHH for silence) plus at most one speech bubble of max 5 English words translated from a real line.\n- In GLOBAL describe placement: sound effects, large bold lettering in the main panel; speech bubble in its panel, tail pointing to the speaker.\n- All letters go into ONE Text: part at the very END of GLOBAL, right before the first |, for example Text: WHAM! GET DOWN. Never write text: inside a character block.\n- Nothing loud happens and nobody speaks: no lettering and no Text: part.\n\nADULTS\nEveryone is an adult: never childlike tags, ages or heights. This format stays non-explicit: in a sexual moment draw a dramatic tasteful panel (faces in close-up, hands, silhouettes, shadows) without nudity.\n\nFORM\nShort tags and panel phrases of up to 10 words, separated by commas, no full sentences. The whole PROMPT is 500-1300 characters; if it gets longer, shorten panel phrases and background first, never appearance or the Text: part.\n\nCHECK SILENTLY BEFORE WRITING\nOne line at the very end; the ratio fits the layout and differs from the PREVIOUS IMAGE when possible; 1-5 panels with position, shot and angle; at least one extreme angle; effects only for real events; lighting and color present; one block per person; lettering is short English UPPERCASE and Text: is the last part of GLOBAL; no names, quotation marks or brackets.\n\nExample:\n[SCENE: 2:3 | 1boy, 1girl, comic, 3 panels, splash page, main panel full body of the man kicking through a door, foreshortening, from below, bursting out of the panel border, flying debris, impact burst, speed lines, top inset panel close-up of the girl gasping, bottom inset panel his clenched fist, halftone, warehouse, night, backlighting, hard shadows, high contrast, red and blue tones, sound effects, large bold lettering in the main panel, Text: KRAK | @Kai, boy, center, short black hair, grey eyes, muscular, black jacket, torn sleeve, main panel kicking the door, furious expression, looking at another | @Mira, girl, top inset panel, long silver hair, blue eyes, white coat, gasping, hand over mouth, looking at another]",
        chibi: "CHIBI PAGE: STICKERS OR MINI FRAMES — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16 (pick it in step 1).\n- PROMPT is ONE line in English: no line breaks, no square brackets, no quotation marks, no markdown, no URL. Use | only to separate sections and # only in contact tags like source#hug; never escape them.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nTHE IDEA\nCute, carefully detailed chibi versions of the story characters acting out the current moment: big heads, small bodies, huge expressive eyes, detailed miniature outfits, accessories and props. Every chibi is recognizable at once: same hair color and style, eye color, outfit colors and accessories as in the story.\nChibi pages are always wholesome and SFW. The characters are adults drawn in chibi style: never childlike tags (child, loli, shota, toddler, kindergarten), never ages. If the moment is sexual or graphic, show a cute safe reaction instead: blushing, hiding face, hearts, steam puffs, a comic dust cloud, everyone fully clothed.\n\nSTEP 1. PICK A FORMAT (decide silently, never write it in the reply)\nMatch the moment and vary between replies. If a PREVIOUS IMAGE line is given, pick another format unless only that one fits.\n- sticker sheet: 1:1; 3-6 chibi stickers with white outline on a simple pastel background, each sticker a different reaction or pose from this moment (happy, pouting, crying, angry, sleepy, love-struck, panicking, proud, thinking). Add multiple views when one character appears several times.\n- mini frames strip: 3:2 or 16:9; 3-4 small rounded frames in a row, each a tiny step of the moment in reading order, cute frame borders.\n- vertical mini frames: 2:3 or 9:16; 3-4 rounded frames stacked top to bottom.\n- chibi scene: 3:2 or 1:1; one cozy miniature diorama of the real location with small props and all characters in it.\n- reaction duo: 1:1; two big chibi heads side by side reacting to each other.\nName every sticker or frame by position (top left sticker, center sticker, first frame, last frame) and say who is in it, what they do and their expression.\n\nSTEP 2. MAKE IT DETAILED\n- Every chibi: chibi, full body, detailed eyes, glossy hair, detailed clothes, clean outline, soft shading.\n- Expressions varied and exaggerated: sparkling eyes, tears, pout, puffed cheeks, wavy mouth, blush stickers, sweatdrop, anger vein, heart, music note, sparkle, steam.\n- Props and setting from the story in miniature: cups, books, swords, pillows, rain, snow.\n- Light, 1 tag: soft lighting, sunlight, warm light, moonlight. Color, 1 tag: pastel colors or warm colors; night scenes may use cool colors.\n\nGLOBAL SECTION, in this order\ncount tags of visible characters, each a separate tag (1girl; 1boy, 1girl; 2girls), chibi, the format (sticker sheet, 4 stickers, or comic, 3 panels, rounded frames), every sticker or frame with position + who + action + expression, background, light, color, and LAST the optional Text: part.\nInside GLOBAL call people by gender and side, never by name. No hair, eyes or clothing in GLOBAL.\n\nCHARACTER BLOCKS\nOne block per character, max 6, covering all stickers or frames of that character. Order inside a block: @Name, girl or boy, chibi, appearance, current clothing, actions and expressions per sticker or frame.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- Appearance: copy the CHARACTERS tags exactly; otherwise hair color and length, hairstyle, eye color, skin tone, notable features.\n- Contact uses raw prefixes: source#hug and target#hug, mutual#holding hands.\n- Never merge people or swap traits.\n\nLETTERING (optional, rare)\nAt most 2 tiny English words in total as sticker captions (YAY, HMPH, SORRY, LOVE YOU), UPPERCASE, all in ONE Text: part at the very END of GLOBAL, right before the first |. Usually no text at all; never text: inside a character block.\n\nFORM\nShort tags and sticker phrases of up to 10 words, separated by commas, no full sentences. The whole PROMPT is 400-1200 characters; if it gets longer, shorten sticker phrases and background first, never appearance.\n\nCHECK SILENTLY BEFORE WRITING\nOne line at the very end; the ratio fits the format; the format differs from the PREVIOUS IMAGE when possible; every chibi detailed and recognizable; everyone clothed and wholesome; one block per person; Text: only if needed and last in GLOBAL; no names, quotation marks or brackets.\n\nExample:\n[SCENE: 1:1 | 1boy, 1girl, chibi, sticker sheet, 4 stickers, multiple views, white outline, simple background, top left sticker the girl pouting with puffed cheeks, top right sticker the man laughing, bottom left sticker the girl hugging a pillow, bottom right sticker both sharing a cup of cocoa with hearts, soft lighting, pastel colors | @Mira, girl, chibi, long silver hair, blue eyes, white sweater, pouting, hugging pillow, sparkling eyes | @Kai, boy, chibi, short black hair, grey eyes, dark hoodie, laughing, holding cup, blush]",
        v4: "NOVELAI V4 SCENE (NAISTERA) — end every reply with ONE marker line.\n\nMARKER\n- It is the very last line of your output, nothing after it:\n[SCENE: RATIO | PROMPT]\n- RATIO is exactly one of 1:1, 2:3, 3:2, 16:9, 9:16.\n- PROMPT is ONE continuous line of English NovelAI V4 / Danbooru tags: no line breaks, no square brackets, no quotation marks or apostrophes, no markdown, no URL. Do not URL-encode anything: write spaces, commas, | and # as they are. Use | only to separate sections and # only in action tags like source#hug.\n- Do not write quality tags, art styles, artist names or negative tags: the engine adds the user style, quality tags and negative prompt by itself.\n\nSCENE ANALYSIS\n- Draw the CURRENT moment of the story exactly: visible characters, current actions, emotions, clothing in its current state, location, time, weather, props and atmosphere.\n- Do not invent a new scene when the current one is clear; if details are missing, infer only the minimum that fits.\n- Character profiles and the CHARACTERS list define looks; the latest story text defines action and the state of clothing.\n\nSTRUCTURE\nGLOBAL | CHARACTER 1 | CHARACTER 2 ...\nGLOBAL contains only these parts, in this order:\n1. Count tags of visible characters, each a separate tag: 1girl; 1boy, 1girl; 2girls; 2boys, 1girl. Count only characters actually visible: never unseen speakers, memories, statues, reflections, posters, paintings, dolls, shadows or background silhouettes.\n2. Composition, 1-2 tags: cowboy shot, upper body, full body, portrait, close-up, wide shot, pov, from above, from below, dutch angle, rule of thirds, cinematic composition, dynamic framing.\n3. Background, 2-5 concrete tags: bedroom, bed, window, couch, table, shower, city street, shrine, forest, rain, snow, fog, furniture, props, architecture.\n4. Lighting, 1-2 tags: soft window light, moonlight, neon lighting, candlelight, overcast daylight, rim light, backlight, dramatic shadows.\n5. Color mood, exactly 1 tag: natural colors, warm colors, cool colors, muted colors, rich colors, high contrast, low contrast, desaturated.\nNever put hair, eyes, body, clothing or actions of a person into GLOBAL.\n\nCHARACTER BLOCKS\nOne self-contained block per visible character, max 6. Order inside a block:\n@Name, girl or boy, position, appearance, clothing, pose, action, expression, gaze.\n- @Name only when a CHARACTERS list is given: the exact name from it, or @other. The engine removes the label; apart from it, names of original characters never appear in the prompt.\n- girl or boy without numbers, then a spatial anchor: left side, right side, center, foreground, background.\n- FULL appearance in every block, never shortened: exact hair color, hair length (short hair, long hair), hairstyle (ponytail, braids, messy hair, straight hair, curly hair, bangs, blunt bangs), eye color, body type (slender, muscular, curvy), skin tone and notable features. If the CHARACTERS list gives appearance tags, copy them exactly and never contradict them.\n- Clothing exactly as it is now: every piece with its color, or its state (unbuttoned, wet, torn, removed).\n- Franchise character (anime, manga, manhwa, game, series, film): Name (series) as the first tag after girl or boy, for example Makima (chainsaw man), plus the full visible appearance anyway.\n- Interactions use action tags inside the owners blocks: source#hug and target#hug, mutual#kissing, source#holding hands.\n- Never merge two people into one block; never give one person the traits or clothes of another.\n- Gaze stays inside the scene: looking at another, looking at object, looking down, closed eyes. Use looking at viewer only for pov or when a character addresses the reader.\n\nADULTS AND NSFW\n- Everyone is an adult: never childlike tags, never ages or heights.\n- Only when the current moment explicitly contains sex or nudity: add nsfw, explicit, uncensored to GLOBAL and name exactly what the story established, in the owners blocks: the act (vaginal, oral, handjob...), the position (missionary, doggystyle, cowgirl position, standing sex, against wall...), the visible intimate body parts and fluids or effects (sweat, blush, tears). For intimate scenes prefer cowboy shot, full body or pov.\n- Never go beyond the story: romance, kissing or closeness alone are not sexual. No censorship words.\n\nFORM\nShort visual tags of 1-4 words separated by commas; no sentences and no vague or metaphorical phrases (beautiful atmosphere, perfect vibe). 400-900 characters. If it gets longer, drop background tags first, never appearance.\n\nExample, the very last line of a reply:\n[SCENE: 2:3 | 1boy, 1girl, cowboy shot, rule of thirds, indoors, bedroom, bed, window, night, moonlight, rim light, cool colors | @Kai, boy, left side, short black hair, messy hair, grey eyes, tall, muscular, pale skin, white shirt, unbuttoned shirt, black pants, sitting on bed, source#hug, gentle smile, looking at another | @Mira, girl, right side, long silver hair, straight hair, blunt bangs, blue eyes, slender, fair skin, oversized black hoodie, sleeves past fingers, target#hug, blush, closed eyes]"
    };
    // ---------------------------------------------------------------- хранилище настроек
    function S() {
        const es = ctx().extensionSettings;
        if (!es[KEY]) es[KEY] = deep(DEF);
        const s = es[KEY];
        // доклеиваем недостающие поля после обновлений
        for (const k of Object.keys(DEF)) if (s[k] === undefined) s[k] = deep(DEF[k]);
        for (const k of Object.keys(DEF.nai)) if (s.nai[k] === undefined) s.nai[k] = DEF.nai[k];
        for (const k of Object.keys(DEF.ns)) if (s.ns[k] === undefined) s.ns[k] = DEF.ns[k];
        for (const k of Object.keys(DEF.proxy)) if (s.proxy[k] === undefined) s.proxy[k] = DEF.proxy[k];
        if (!s.api || !Array.isArray(s.api.list)) s.api = { list: [] };
        return s;
    }
    function save() {
        try { const c = ctx(); if (typeof c.saveSettingsDebounced === 'function') { c.saveSettingsDebounced(); return; } } catch (e) { }
        try { if (typeof window.saveSettingsDebounced === 'function') { window.saveSettingsDebounced(); return; } } catch (e) { }
        try { const c = ctx(); if (typeof c.saveSettings === 'function') { c.saveSettings(); return; } } catch (e) { }
        try { localStorage.setItem('shk2_fallback', JSON.stringify(ctx().extensionSettings[KEY] || {})); } catch (e) { }
    }

    let LIB = null;
    function lib() {
        if (LIB) return LIB;
        const s = S();
        if (!s.library || !Array.isArray(s.library.styles)) {
            s.library = deep(DEF_LIB);
        }
        const lb = s.library;
        // встроенные шаблоны: подставляем тексты из TPL, если пустые
        const map = { p_scene: 'scene', p_comic: 'comic', p_marvel: 'marvel', p_chibi: 'chibi', p_v4: 'v4' };
        lb.prompts.forEach((p) => { if (map[p.id] && !l(p.text).trim()) p.text = TPL[map[p.id]] || ''; });
        for (const d of DEF_LIB.styles) if (!lb.styles.some((x) => x.id === d.id)) lb.styles.push(deep(d));
        for (const d of DEF_LIB.negs) if (!lb.negs.some((x) => x.id === d.id)) lb.negs.push(deep(d));
        for (const d of DEF_LIB.prompts) if (!lb.prompts.some((x) => x.id === d.id)) lb.prompts.push(deep(d));
        LIB = lb;
        return lb;
    }
    const libFind = (arr, id) => (arr || []).filter((x) => x.id === id)[0] || null;
    function saveLib() { LIB = null; save(); }

    // семейство модели: v5 | v4
    const provFamily = (s) => (s.provider === 'naistera' && !/^novelai-v5/i.test(s.ns.model) ? 'v4' : 'v5');
    const FAM = { v5: { tpl: 'promptId', style: 'styleId', neg: 'negId' }, v4: { tpl: 'promptIdV4', style: 'styleIdV4', neg: 'negIdV4' } };
    const DEF_TPL = { v5: 'p_scene', v4: 'p_v4' };
    const KINDS = ['scene', 'comic', 'v4', 'custom'];
    const kindOk = (kind, fam) => kind === 'custom' || (kind === 'v4' ? 'v4' : 'v5') === fam;
    function activePrompt(s) {
        const fam = provFamily(s || S());
        const id = (s || S())[FAM[fam].tpl];
        const lb = lib();
        let p = libFind(lb.prompts, id);
        if (!p || !kindOk(p.kind, fam)) p = libFind(lb.prompts, DEF_TPL[fam]);
        if (!p || !kindOk(p.kind, fam)) p = (lb.prompts || []).filter((q) => kindOk(q.kind, fam))[0] || null;
        return p;
    }
    function activeStyle(s) {
        s = s || S(); const fam = provFamily(s);
        const st = libFind(lib().styles, s[FAM[fam].style]);
        return st && (st.fam === 'v5' || st.fam === 'v4') && (st.fam === fam) ? st : null;
    }
    function activeNeg(s) {
        s = s || S(); const fam = provFamily(s);
        const ng = libFind(lib().negs, s[FAM[fam].neg]);
        return ng && (ng.fam === 'v5' || ng.fam === 'v4') && (ng.fam === fam) ? ng : null;
    }

    // ---------------------------------------------------------------- метаданные чата: внешности и сцены
    function meta() {
        const m = ctx().chatMetadata;
        if (!m.shark) m.shark = { looks: {}, npcs: [], scenes: {} };
        if (!m.shark.looks) m.shark.looks = {};
        if (!Array.isArray(m.shark.npcs)) m.shark.npcs = [];
        if (!m.shark.scenes) m.shark.scenes = {};
        return m.shark;
    }
    function saveMeta() { try { const c = ctx(); if (typeof c.saveChat === 'function') c.saveChat(); } catch (e) { } }
    const lookKey = (kind, name) => 'look_' + kind + '_' + h36(l(name).toLowerCase());
    function cleanLook(o) {
        o = jparse(o) || {};
        return {
            g: ['girl', 'boy', 'other'].indexOf(o.g) >= 0 ? o.g : '',
            app: l(o.app).trim(),
            cloth: l(o.cloth).trim(),
            alias: l(o.alias).trim(),
            neg: l(o.neg).trim(),
            ...(o.auto && o.app ? { auto: 1 } : {}),
        };
    }
    // персонажи чата (+персона пользователя)
    function chatChars() {
        const cc = ctx();
        const list = [];
        try {
            const ids = (cc.characters && cc.characters.length) ? cc.characters.map((_, i) => i) : [];
            const seen = {};
            for (const ch of cc.chat) {
                if (ch.is_user || ch.is_system) continue;
                const nm = l(ch.name).trim();
                if (!nm || seen[nm]) continue;
                seen[nm] = 1;
                list.push({ name: nm, kind: 'c' });
            }
        } catch (e) { }
        return list;
    }
    function personaName() { const cc = ctx(); return l(cc.name1).trim() || 'User'; }
    // список луков: персонажи + персона + NPC
    function collectLooks() {
        const m = meta();
        const out = [];
        for (const ch of chatChars()) {
            const k = lookKey('c', ch.name);
            const lk = cleanLook(m.looks[k]);
            out.push({ ...lk, name: ch.name, kind: 'c', id: ch.name, key: k });
        }
        const pn = personaName();
        if (pn) {
            const k = lookKey('u', pn);
            const lk = cleanLook(m.looks[k]);
            out.push({ ...lk, name: pn, kind: 'u', id: pn, key: k });
        }
        for (const n of m.npcs) {
            const e = cleanLook(n);
            if (!e.name) continue;
            out.push({ ...e, kind: 'n', id: l(n.id) || uid(), key: 'npc_' + l(n.id) });
        }
        return out;
    }
    function saveLook(lk) {
        const m = meta();
        if (lk.kind === 'n') {
            const arr = m.npcs;
            const i = arr.findIndex((x) => l(x.id) === l(lk.id));
            const rec = { id: lk.id, name: lk.name, g: lk.g, app: lk.app, cloth: lk.cloth, alias: lk.alias, neg: lk.neg };
            if (rec.app) rec.auto = lk.auto ? 1 : undefined;
            if (i >= 0) arr[i] = rec; else arr.push(rec);
        } else {
            m.looks[lk.key] = cleanLook(lk);
        }
        saveMeta();
    }

    // ---------------------------------------------------------------- маркер сцены
    const MARKER_RX = /\[(?:[A-ZА-ЯЁ]{2,24}_)?SCENE:\s*([^\]]*?)\s*\]/;
    const MARKER_G = /\[(?:[A-ZА-ЯЁ]{2,24}_)?SCENE:\s*([^\]]*?)\s*\]/g;
    const ANCHOR_G = /<!--scene:([a-z0-9]{4,40})-->/g;
    const anchor = (id) => '<!--scene:' + id + '-->';
    const RATIOS = ['1:1', '2:3', '3:2', '9:16', '16:9'];
    function parseMarker(inner) {
        let t = l(inner).replace(/\r/g, '').trim(), ratio = '', desc = t;
        const m = t.match(/^(\d{1,2}:\d{1,2})\s*\|\s*([\s\S]*)/);
        if (m) { ratio = m[1]; desc = m[2]; }
        if (RATIOS.indexOf(ratio) < 0) ratio = '3:2';
        desc = l(desc).replace(/\s*\n\s*/g, ' ').trim();
        if (desc.length > 4000) desc = desc.slice(0, 4000);
        return { ratio, desc };
    }
    const hasCyr = (s) => !/^[A-Z0-9_\s|:,.-]*$/.test(l(s));
    // найти ПОСЛЕДНИЙ валидный маркер в тексте
    function findMarker(text) {
        let m = null, r = null;
        MARKER_G.lastIndex = 0;
        while ((r = MARKER_G.exec(l(text)))) {
            const p = parseMarker(r[1]);
            if (p.desc && hasCyr(p.desc)) { p.raw = r[0]; m = p; }
        }
        MARKER_G.lastIndex = 0;
        return m;
    }
    function findAnchor(text) { let m = null, r; ANCHOR_G.lastIndex = 0; while ((r = ANCHOR_G.exec(l(text)))) m = r[1]; ANCHOR_G.lastIndex = 0; return m; }
    // «очистить» сообщение для LLM/контекста: убрать маркеры и якоря, теги → пробелы
    function plainify(s) {
        return l(s).replace(/<!--scene:[a-z0-9]{4,40}-->/g, '').replace(MARKER_G, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }

    // ---------------------------------------------------------------- мэтчинг слов (имена, алиасы)
    const CYR2LAT = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
    function translit(s) { return l(s).toLowerCase().split('').map((ch) => (Object.prototype.hasOwnProperty.call(CYR2LAT, ch) ? CYR2LAT[ch] : ch)).join(''); }
    // список слов из имени и алиасов (оригинал + транслит)
    function wordKeys(name, alias) {
        const out = [];
        [l(name)].concat(l(alias).split(/[,;\n]/)).forEach((raw) => {
            let e = raw.toLowerCase().trim();
            if (!e) return;
            [e, translit(e)].forEach((v) => {
                v.split(/[^0-9a-zа-яё]+/i).forEach((p) => { if (p.length >= 2 && out.indexOf(p) < 0) out.push(p); });
            });
        });
        return out;
    }
    const mentions = (text, keys) => { if (!keys.length) return false; const n = ' ' + l(text).toLowerCase().replace(/[^0-9a-zа-яё]+/gi, ' ') + ' '; return keys.some((k) => n.indexOf(' ' + k + ' ') !== -1); };
    // угадать пол по тегам внешности
    function genderFrom(app) {
        const e = ' ' + l(app).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
        const f = / (1girl|girl|woman|female|lady) /.test(e), m = / (1boy|boy|man|male|guy) /.test(e);
        return f && !m ? 'girl' : m && !f ? 'boy' : '';
    }
    const LABEL_RX = /^\s*@([^,|]{1,60}?)\s*,\s*/;
    const lookTags = (lk) => [lk.app, lk.cloth].map((v) => w(l(v).replace(/[\[\]|]/g, ' '))).filter(Boolean).join(', ');

    // вычистить из текста блока конфликтующие теги внешности (длина/цвет волос, глаза, кожа),
    // если лук уже задаёт их: модель не должна «перекрашивать» персонажа
    const HAIR_COL = '(?:light |dark |pale |deep |bright )?(?:black|blonde|blond|brown|red|white|silver|grey|gray|pink|blue|green|purple|violet|orange|aqua|yellow|golden|gold|teal|cyan|lavender|platinum blonde|ash blonde|strawberry blonde|platinum|ginger|auburn|chestnut|beige|magenta|crimson|scarlet|amber|hazel|maroon|navy|turquoise|emerald|indigo|multicolored|two-tone|gradient|streaked|rainbow)';
    const HAIR_RX = new RegExp('^(?:(very short|short|medium|long|very long|absurdly long|shoulder-length|waist-length)\\s+)?(?:(' + HAIR_COL + '|dark|light)\\s+)?hair$');
    const EYES_RX = new RegExp('^(' + HAIR_COL + ')\\s+eyes$');
    const SKIN_RX = /^(dark|pale|tan|tanned|fair|light|olive|brown|white|black|grey|gray|blue|green|red|purple)[- ](?:skin|skinned(?: female| male)?)$/;
    const normLookCol = (s) => l(s).replace(/\bblond\b/, 'blonde').replace(/gray/g, 'grey').replace(/\bgolden\b/, 'gold');
    const normSkin = (s) => s.replace('tanned', 'tan').replace('gray', 'grey');
    const FLEX_COL = /^(multicolored|two-tone|gradient|streaked|rainbow)$/;
    function stripConflicts(text, app) {
        const have = { len: {}, col: {}, eye: {}, skin: {} };
        l(app).split(',').forEach((t) => {
            let m; const n = normTag(t);
            if ((m = HAIR_RX.exec(n))) { if (m[1]) have.len[m[1]] = 1; if (m[2] && !FLEX_COL.test(m[2])) have.col[normLookCol(m[2])] = 1; }
            else if ((m = EYES_RX.exec(n))) have.eye[normLookCol(m[1])] = 1;
            else if ((m = SKIN_RX.exec(n))) have.skin[normSkin(m[1])] = 1;
        });
        const any = (o) => Object.keys(o).length > 0;
        if (!any(have.len) && !any(have.col) && !any(have.eye) && !any(have.skin)) return text;
        return w(l(text).split(',').filter((t) => {
            const n = normTag(t);
            let m;
            if ((m = HAIR_RX.exec(n))) return !(m[1] && any(have.len) && !have.len[m[1]] || m[2] && !FLEX_COL.test(m[2]) && any(have.col) && !have.col[normLookCol(m[2])]);
            if ((m = EYES_RX.exec(n))) return !(any(have.eye) && !have.eye[normLookCol(m[1])]);
            if ((m = SKIN_RX.exec(n))) return !(any(have.skin) && !have.skin[normSkin(m[1])]);
            return true;
        }).join(','));
    }

    // ---------------------------------------------------------------- композиция сцены
    // desc — текст маркера; looks — список луков. Возвращает {base, chars, negs, hit, match, guard, gneg}
    function compose(desc, looks) {
        const texts = [];
        const parts = l(desc).split('|').map((p) => { const e = E(p); if (e.text) texts.push(e.text); return e.tags.trim(); }).filter(Boolean);
        const out = { base: w(parts[0] || ''), chars: [], negs: [], hit: {}, match: [] };
        const blocks = parts.slice(1).map((t) => {
            const m = LABEL_RX.exec(t);
            let lab = '';
            if (m) { lab = m[1].trim(); t = t.slice(m[0].length); }
            return { t: w(t), lab, who: -1 };
        });
        const L = (looks || []).map((lk, i) => ({ i, l: lk, w: wordKeys(lk.name, lk.alias), g: lk.g || genderFrom(lk.app), tags: lookTags(lk), at: -1 }));
        const taken = {};
        const s = (lk, bi, sure) => { lk.at = bi; blocks[bi].who = lk.i; blocks[bi].sure = !!sure; taken[bi] = 1; };
        // 1) точное совпадение по метке @Name
        blocks.forEach((b, bi) => {
            if (!b.lab || /^other$/i.test(b.lab)) return;
            const ws = wordKeys(b.lab, '');
            for (const lk of L) { if (lk.at < 0 && ws.some((x) => lk.w.indexOf(x) >= 0)) { s(lk, bi, true); break; } }
        });
        // 2) по упоминанию имени в блоке (2 прохода)
        for (let pass = 0; pass < 2; pass++) {
            for (const lk of L) {
                if (lk.at >= 0) continue;
                for (let bi = 0; bi < blocks.length; bi++) {
                    if (taken[bi] || /^other$/i.test(blocks[bi].lab)) continue;
                    if (mentions(blocks[bi].t, lk.w)) {
                        const others = L.filter((o) => o !== lk && mentions(blocks[bi].t, o.w)).length;
                        if (pass !== 0 || !others) { s(lk, bi, !others); break; }
                    }
                }
            }
        }
        // 3) одиночный девушка/парень без метки
        ['girl', 'boy'].forEach((g) => {
            const un = L.filter((v) => v.at < 0 && v.g === g);
            const cands = [];
            blocks.forEach((b, bi) => { if (!taken[bi] && !b.lab && genderFrom(b.t) === g) cands.push(bi); });
            if (un.length === 1 && cands.length === 1) s(un[0], cands[0]);
        });
        // 4) главный персонаж → единственный блок без метки
        const unlabeled = [];
        blocks.forEach((b, bi) => { if (!taken[bi] && !b.lab) unlabeled.push(bi); });
        const firstChar = L.filter((v) => v.l.kind === 'c')[0];
        if (firstChar && firstChar.at < 0 && unlabeled.length === 1 && (blocks.length === 1 || L.some((v) => v.at >= 0))) s(firstChar, unlabeled[0]);
        // 5) собрать блоки
        blocks.forEach((b) => {
            const lk = b.who >= 0 ? L[b.who] : null;
            if (lk && b.sure) out.match.push({ i: lk.i, t: b.t });
            const r = lk && lk.l.app ? stripConflicts(b.t, lk.l.app) : b.t;
            out.chars.push(lk && lk.tags ? xmerge(r, lk.tags) : r);
            out.negs.push(lk ? w(lk.l.neg) : '');
            if (lk && lk.tags) out.hit[lk.l.key] = 1;
        });
        // 6) неиспользованные луки — впрыснуть в базу
        if (blocks.length) {
            L.forEach((lk) => { if (lk.at < 0 && lk.tags && mentions(out.base, lk.w)) { out.base = xmerge(out.base, lk.tags); out.hit[lk.l.key] = 1; } });
        } else {
            const p = L.filter((lk) => lk.tags && mentions(out.base, lk.w));
            if (p.length >= 2) {
                p.forEach((lk) => { out.chars.push(lk.tags); out.negs.push(w(lk.l.neg)); out.hit[lk.l.key] = 1; });
            } else if (p.length === 1) {
                out.base = xmerge(stripConflicts(out.base, p[0].l.app), p[0].tags);
                out.hit[p[0].l.key] = 1;
            } else if (firstChar && firstChar.tags && /(^|[^a-z])(\d+(girl|boy|other)s?|girls?|boys?|wom[ae]n|m[ae]n|male|female|person|people|couple|solo|duo|portrait)([^a-z]|$)/i.test(l(out.base))) {
                out.base = xmerge(stripConflicts(out.base, firstChar.l.app), firstChar.tags);
                out.hit[firstChar.l.key] = 1;
            }
        }
        out.base = O(out.base, texts.join(' '));
        return out;
    }

    // ---------------------------------------------------------------- гарды (фильтры NovelAI)
    const NSFW_RX = /^(nsfw|explicit|uncensored|nude|naked|completely nude|topless|bottomless|sex|sex from behind|vaginal|anal|oral|fellatio|cunnilingus|penis|pussy|vagina|nipples|areolae|cum|cum in pussy|x-ray|cross-section|after sex|spread legs|missionary|cowgirl position|doggystyle|reverse cowgirl position|straddling|groping|breast grab|masturbation|handjob|paizuri|pubic hair|erection|ejaculation|orgasm|penetration|imminent penetration|clothed sex|nude cover)$/;
    const AGE_RX = /^(loli|shota|child|children|kid|kids|toddler|baby|infant|little girl|little boy|young girl|young boy|kindergarten|elementary school|elementary schooler|elementary school student|aged down|preschooler)$/;
    const stripRx = (s, rx) => { const e = E(s); return O(w(e.tags.split(',').filter((t) => !rx.test(normTag(t).replace(/^(source|target|mutual)#/, ''))).join(', ')), e.text); };
    const qTags = (model, q) => {
        if (!q || q === 'none') return '';
        if (model.indexOf('nai-diffusion-5-') === 0) return q === 'light' ? 'very aesthetic, amazing quality, no text' : 'very aesthetic, masterpiece, no text';
        if (model === 'nai-diffusion-4-5-curated') return 'location, masterpiece, no text, -0.8::feet::, rating:general';
        return 'location, very aesthetic, masterpiece, no text';
    };
    // quality tags к базе; если на картинке текст — убрать "no text"
    const addQuality = (s, qt) => { if (!qt) return s; const e = E(s); if (hasText(s)) qt = qt.split(',').map((t) => t.trim()).filter((t) => t && t.toLowerCase() !== 'no text').join(', '); return O(xmerge(e.tags, qt), e.text); };
    function applyGuards(comp, styleTags) {
        const all = [E(comp.base).tags].concat(comp.chars, [l(styleTags)]).join(',').split(',').map((t) => normTag(t).replace(/^(source|target|mutual)#/, ''));
        const chibi = all.indexOf('chibi') >= 0;
        const nsfw = all.some((t) => NSFW_RX.test(t));
        if (chibi && nsfw) {
            comp.base = stripRx(comp.base, NSFW_RX);
            comp.chars = comp.chars.map((t) => stripRx(t, NSFW_RX));
            comp.gneg = 'nsfw, nude, explicit';
            comp.guard = NSFW_RX;
        } else if (nsfw) {
            comp.base = stripRx(comp.base, AGE_RX);
            comp.chars = comp.chars.map((t) => stripRx(t, AGE_RX));
            comp.gneg = 'loli, shota, child';
            comp.guard = AGE_RX;
        }
        if (comp.guard) { styleTags = stripRx(styleTags, comp.guard); }
        return styleTags;
    }

    // ---------------------------------------------------------------- NovelAI параметры
    const SIZES = {
        small: { '1:1': [640, 640], '2:3': [512, 768], '3:2': [768, 512], '9:16': [448, 832], '16:9': [832, 448] },
        normal: { '1:1': [1024, 1024], '2:3': [832, 1216], '3:2': [1216, 832], '9:16': [768, 1344], '16:9': [1344, 768] },
        big: { '1:1': [1472, 1472], '2:3': [1024, 1536], '3:2': [1536, 1024], '9:16': [1088, 1920], '16:9': [1920, 1088] },
    };
    const sizeOf = (nai, ratio) => { const t = SIZES[nai.size] || SIZES.normal; return t[ratio] || t['3:2']; };
    const isV5 = (m) => l(m).indexOf('nai-diffusion-5-') === 0;
    const isMedium = (m) => m === 'nai-diffusion-5-full-medium';
    const UC_BASE = 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page';
    function ucPreset(model, uc) {
        if (isMedium(model)) return UC_BASE;
        const curated = model === 'nai-diffusion-4-5-curated';
        const heavy = curated ? 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page' : UC_BASE;
        if (uc === 'heavy') return heavy;
        if (uc === 'light') return isV5(model) ? 'lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::' : curated ? 'blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page' : 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page';
        if (uc === 'human') return curated ? 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page' : heavy + ', @_@, mismatched pupils, glowing eyes, bad anatomy';
        return '';
    }

    // ---------------------------------------------------------------- сеть
    function fetchT(url, opts, ms) {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) { } }, ms || 180000);
        opts = opts || {};
        if (ctl) opts.signal = ctl.signal;
        return fetch(url, opts).then((r) => { clearTimeout(timer); return r; }, (e) => {
            clearTimeout(timer);
            if (e && e.name === 'AbortError') throw mkErr('timeout', 'Превышено время ожидания (таймаут запроса)');
            throw mkErr('network', 'Сетевой сбой: ' + (e && e.message ? e.message : 'нет соединения'));
        });
    }
    // NovelAI отдаёт ZIP (или чистый PNG): достаём PNG
    function unpackZip(buf) {
        const t = new Uint8Array(buf);
        if (t[0] === 137 && t[1] === 80 && t[2] === 78 && t[3] === 71) return Promise.resolve(new Blob([t], { type: 'image/png' }));
        if (!(t[0] === 80 && t[1] === 75 && t[2] === 3 && t[3] === 4)) return Promise.reject(mkErr('badimg', 'Сервер вернул не картинку (не PNG/ZIP)'));
        const dv = new DataView(t.buffer, t.byteOffset);
        const method = dv.getUint16(8, true);
        const flags = dv.getUint16(6, true);
        const csize = dv.getUint32(18, true);
        const start = 30 + dv.getUint16(26, true) + dv.getUint16(28, true);
        let end = -1;
        if (!(flags & 8) && csize > 0) end = start + csize;
        else {
            for (let i = t.length - 22; i >= 0; i--) {
                if (t[i] === 80 && t[i + 1] === 75 && t[i + 2] === 5 && t[i + 3] === 6) { end = dv.getUint32(i + 16, true); break; }
            }
            if (end < 0) return Promise.reject(mkErr('badimg', 'Не удалось прочитать ZIP от NovelAI'));
            end = (t[end - 16] === 80 && t[end - 15] === 75 && t[end - 14] === 7 && t[end - 13] === 8) ? end - 16 : end - 12;
        }
        const chunk = t.subarray(start, end);
        if (method === 0) return Promise.resolve(new Blob([chunk], { type: 'image/png' }));
        if (typeof DecompressionStream === 'undefined') return Promise.reject(mkErr('badimg', 'Браузер не умеет распаковывать ZIP (DecompressionStream)'));
        const ds = new DecompressionStream('deflate-raw');
        const wr = ds.writable.getWriter();
        wr.write(chunk); wr.close();
        return new Response(ds.readable).arrayBuffer().then((b) => new Blob([b], { type: 'image/png' }));
    }
    function blobToData(blob) {
        if (typeof FileReader !== 'undefined') return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => rej(mkErr('badimg', 'Не удалось прочитать картинку'));
            r.readAsDataURL(blob);
        });
        return blob.arrayBuffer().then((b) => {
            const u = new Uint8Array(b); let s = '';
            for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
            return 'data:' + (blob.type || 'image/png') + ';base64,' + btoa(s);
        });
    }
    function httpErr(res, text, extra) {
        const code = res.status;
        let msg = 'HTTP ' + code;
        if (code === 401 || code === 403) msg = 'Неверный или просроченный токен (401/403)';
        else if (code === 402) msg = 'Закончились Anlas / нет подписки (402)';
        else if (code === 429) msg = 'Сервер перегружен (429), попробуй позже';
        else if (code >= 500) msg = 'Сбой сервера (' + code + ')';
        else msg = 'HTTP ' + code + ': ' + l(text).slice(0, 160);
        const e = mkErr('http', (extra ? extra + ' — ' : '') + msg);
        e.status = code;
        return e;
    }

    // ---------------------------------------------------------------- NovelAI generate
    function naiGenerate(naiSet, token, comp, negUser, seed, ratio, stage) {
        if (!token) return Promise.reject(mkErr('cfg', 'Не задан токен NovelAI (вкладка «API»)'));
        const model = naiSet.model, v5 = isV5(model), medium = isMedium(model);
        const [W, H] = sizeOf(naiSet, ratio);
        let chars = comp.chars.slice(), cneg = comp.negs.slice(), base = comp.base;
        const cap = v5 ? 22 : 6;
        if (chars.length > cap) { base = I(base, chars.slice(cap).join(', ')); chars = chars.slice(0, cap); cneg = cneg.slice(0, cap); }
        base = addQuality(base, qTags(model, naiSet.quality));
        const neg = negFilter(medium ? xmerge(UC_BASE, comp.gneg || '') : [ucPreset(model, naiSet.uc), w(negUser)].filter(Boolean).join(', '), base, chars);
        while (cneg.length < chars.length) cneg.push('');
        const cap4 = (t, arr) => ({ base_caption: t, char_captions: arr.map((ch) => ({ char_caption: ch, centers: [{ x: 0.5, y: 0.5 }] })) });
        const params = {
            params_version: 4,
            width: W, height: H,
            scale: naiSet.scale,
            sampler: medium ? 'k_euler_ancestral' : naiSet.sampler,
            steps: medium ? 14 : naiSet.steps,
            n_samples: 1,
            seed: seed,
            ucPreset: medium ? 0 : 3,
            qualityToggle: false,
            cfg_rescale: 0,
            noise_schedule: naiSet.noise,
            negative_prompt: neg,
            deliberate_euler_ancestral_bug: false,
            prefer_brownian: true,
            v4_prompt: { caption: cap4(base, chars), use_coords: false, use_order: true, legacy_uc: false },
            v4_negative_prompt: { caption: cap4(neg, medium ? chars.map(() => '') : cneg), use_coords: false, use_order: false, legacy_uc: false },
        };
        if (medium) delete params.cfg_rescale;
        const req = { input: base, model: model, action: 'generate', parameters: params };
        let retried429 = 0, retried400 = false;
        const go = () => fetchT('https://image.novelai.net/ai/generate-image', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        }, 180000).then((res) => {
            if (res.ok) return res.arrayBuffer().then(unpackZip);
            return res.text().then((txt) => {
                if (res.status === 429 && retried429 < 1) { retried429++; if (stage) stage('Сервер занят (429), жду 8 сек…'); return sleep(8000).then(go); }
                if (res.status === 400 && !retried400 && /token|length|long|prompt/i.test(txt)) {
                    retried400 = true;
                    const e = E(req.input);
                    req.input = O(cut(e.tags, Math.max(300, (isV5(model) ? 2400 : 900) - e.text.length)), e.text);
                    req.parameters.v4_prompt.caption.base_caption = req.input;
                    return go();
                }
                throw httpErr(res, txt, 'NovelAI');
            });
        });
        if (stage) stage('Рисую в NovelAI…');
        return go().then(blobToData).then((data) => ({ data, w: W, h: H, req: { base, chars, neg } }));
    }

    // ---------------------------------------------------------------- naiproxy
    function proxyGenerate(set, token, comp, negUser, seed, ratio, styleTags, stage) {
        if (!isHttps(set.proxy.url)) return Promise.reject(mkErr('cfg', 'Укажи HTTPS-адрес прокси (вкладка «API»)'));
        const model = set.nai.model;
        const [W, H] = sizeOf(set.nai, ratio);
        const body = {
            prompt: comp.base, ratio: ratio, seed: seed, model: model,
            sampler: isMedium(model) ? 'k_euler_ancestral' : set.nai.sampler,
            noise: set.nai.noise,
            steps: isMedium(model) ? 14 : set.nai.steps,
            scale: set.nai.scale,
            width: W, height: H,
        };
        if (set.proxy.sendTok && token) body.token = token;
        if (negUser) body.negative = negUser;
        if (stage) stage('Рисую через прокси…');
        return fetchT(set.proxy.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) }, 300000)
            .then((res) => {
                if (!res.ok) return res.text().then((t) => { throw httpErr(res, t, 'Прокси'); });
                const ct = res.headers.get('content-type') || '';
                if (/json/i.test(ct)) {
                    return res.json().then((j) => {
                        const img = extractImg(j);
                        if (!img) throw mkErr('badimg', 'Прокси вернул JSON без картинки');
                        return img;
                    });
                }
                return res.arrayBuffer().then((b) => {
                    const u = new Uint8Array(b);
                    if (u[0] === 137 && u[1] === 80) return Promise.resolve('data:image/png;base64,' + base64(u));
                    try { const j = JSON.parse(new TextDecoder().decode(u)); const img = extractImg(j); if (img) return Promise.resolve(img); } catch (e) { }
                    return unpackZip(b).then(blobToData);
                });
            })
            .then((data) => ({ data, w: W, h: H, req: { base: comp.base, chars: comp.chars, neg: negUser } }));
    }
    function base64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); }
    function extractImg(j) {
        const cands = [];
        const push = (v) => { if (!v) return; if (typeof v === 'string') cands.push(v); else if (typeof v === 'object') cands.push(v.data_url, v.url, v.image, v.b64_json, v.b64, v.base64); };
        if (!j || typeof j !== 'object') return null;
        push(j.data_url); push(j.image); push(j.url);
        if (j.images && j.images[0]) push(j.images[0]);
        if (typeof j.data === 'string') push(j.data);
        else if (Array.isArray(j.data)) j.data.forEach(push);
        else if (j.data && typeof j.data === 'object') push(j.data);
        push(j.result); push(j.output);
        for (const v of cands) {
            const s = l(v).trim();
            if (!s) continue;
            if (/^data:image\//i.test(s)) return s;
            if (/^https?:\/\//i.test(s)) return s.replace(/^http:/i, 'https:');
            if (s.length > 200 && /^[A-Za-z0-9+\/=\s]+$/.test(s)) {
                const clean = s.replace(/\s+/g, '');
                const mime = clean.indexOf('/9j/') === 0 ? 'image/jpeg' : clean.indexOf('UklGR') === 0 ? 'image/webp' : 'image/png';
                return 'data:' + mime + ';base64,' + clean;
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- Naistera
    const NS_BASE = 'https://naistera.org';
    const NS_UC = 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, too many watermarks, negative space, blank page';
    function nsGenerate(set, token, comp, negUser, seed, ratio, styleTags, stage) {
        if (!token) return Promise.reject(mkErr('cfg', 'Не задан токен Naistera (вкладка «API»)'));
        const model = set.ns.model;
        const cap = /^novelai-v5/i.test(model) ? 22 : 6;
        let chars = comp.chars.slice(), f = comp.base;
        if (styleTags) f = /[.\]]$/.test(styleTags) ? styleTags + ' ' + f : w(styleTags + ', ' + f);
        if (chars.length > cap) { f = I(f, chars.slice(cap).join(', ')); chars = chars.slice(0, cap); }
        f = addQuality(f, set.ns.quality === 'none' ? '' : (/^novelai-v5/i.test(model) ? 'very aesthetic, masterpiece, no text' : 'location, very aesthetic, masterpiece, no text'));
        const fe = E(f);
        const m = cut(fe.tags, Math.max(400, 2600 - fe.text.length - chars.join(' | ').length));
        const body = { prompt: [O(m, fe.text)].concat(chars).join(' | '), aspect_ratio: ratio, model: model };
        const catEntry = (set.ns.cat || []).filter((x) => x && x.id === model)[0];
        const useNeg = catEntry ? catEntry.neg !== false : !/medium/i.test(model);
        if (useNeg) { const neg = negFilter([NS_UC, negUser].filter(Boolean).join(', '), f, chars); if (neg) body.negative_prompt = neg; }
        if (stage) stage('Отправляю в Naistera…');
        const toData = (j) => {
            const img = extractImg(j);
            if (!img) throw mkErr('badimg', 'Naistera вернула ответ без картинки');
            if (img.indexOf('data:') === 0) return Promise.resolve(img);
            return fetchT(img, {}, 120000).then((r) => { if (!r.ok) throw mkErr('http', 'Не удалось скачать картинку от Naistera'); return r.blob(); }).then(blobToData);
        };
        let started = now(), lastTick = 0;
        const poll = (jobId) => sleep(3000).then(() => {
            if (now() - started > 600000) throw mkErr('timeout', 'Naistera не ответила за 10 минут');
            if (now() - lastTick > 30000) { lastTick = now(); if (stage) stage('Жду картинку от Naistera…'); }
            return fetchT(NS_BASE + '/api/generate/jobs/' + encodeURIComponent(jobId), { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }, 30000).then((res) => res.text().then((txt) => {
                if (!res.ok) throw httpErr(res, txt, 'Naistera');
                const j = jparse(txt) || {};
                const st = l(j.status).toLowerCase();
                if (extractImg(j)) return toData(j);
                if (st === 'failed' || st === 'error' || j.error) {
                    const d = j.detail || (j.error && (j.error.message || j.error)) || j.message || '—';
                    throw mkErr('http', 'Naistera: генерация провалилась — ' + cut(l(typeof d === 'object' ? JSON.stringify(d) : d), 160));
                }
                return poll(jobId);
            }));
        });
        return fetchT(NS_BASE + '/api/generate', { method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 300000)
            .then((res) => res.text().then((txt) => {
                if (!res.ok) throw httpErr(res, txt, 'Naistera');
                const j = jparse(txt) || {};
                if (extractImg(j)) return toData(j);
                if (j.job_id || j.id) return poll(l(j.job_id || j.id));
                throw mkErr('badimg', 'Naistera вернула непонятный ответ');
            }))
            .then((data) => {
                const dims = dataDims(data);
                return { data, w: dims ? dims[0] : 0, h: dims ? dims[1] : 0, req: { base: f, chars, neg: body.negative_prompt || '' } };
            });
    }
    // прочитать размеры из dataURL (первые ~87 КБ достаточно)
    function dataDims(dataUrl) {
        try {
            const m = /^data:[^,]*;base64,(.*)$/.exec(l(dataUrl));
            if (!m) return null;
            const bin = atob(m[1].slice(0, 87400));
            const at = (i) => bin.charCodeAt(i) & 255;
            if (at(0) === 137 && at(1) === 80) return [(at(16) << 24 | at(17) << 16 | at(18) << 8 | at(19)) >>> 0, (at(20) << 24 | at(21) << 16 | at(22) << 8 | at(23)) >>> 0];
            if (at(0) === 255 && at(1) === 216) {
                for (let o = 2; o + 9 < bin.length;) {
                    if (at(o) === 255) {
                        const marker = at(o + 1);
                        const len = at(o + 2) << 8 | at(o + 3);
                        if (marker >= 192 && marker <= 195) return [at(o + 7) << 8 | at(o + 8), at(o + 5) << 8 | at(o + 6)];
                        o += 2 + len;
                    } else o++;
                }
            }
        } catch (e) { }
        return null;
    }

    // ---------------------------------------------------------------- список CHARACTERS для LLM
    function charsList(looks) {
        if (!looks.length) return '';
        let anyEmpty = false;
        const lines = looks.map((lk) => {
            const t = lookTags(lk);
            if (!t) anyEmpty = true;
            return '@' + lk.name + (lk.g ? ' (' + lk.g + ')' : '') + (lk.kind === 'u' ? ' — персона пользователя' : lk.kind === 'n' ? ' — NPC' : '') + ': ' + (t || 'внешность пока не сохранена');
        });
        return 'CHARACTERS (fixed looks: copy each listed appearance into that character block exactly, every time, even if the story does not repeat it; never change hair, eye or skin color' + (anyEmpty ? '. For anyone with no stored look yet, take hair color and length, hairstyle, eye color, skin tone and build from the character profile and keep them identical in every picture' : '') + '):\n' + lines.join('\n');
    }
    // предыдущая картинка (для комикс-шаблона — чтобы не повторять раскладку)
    function prevImageHint(kind) {
        if (kind !== 'comic') return '';
        const m = meta();
        const h = m.lastImg;
        if (!h || !h.h) return '';
        return 'PREVIOUS IMAGE in this chat: ' + (h.r ? h.r + ', ' : '') + l(h.h).replace(/[\[\]|<>]/g, ' ') + '. Pick another ratio or layout when another one fits this beat.';
    }
    function rememberLayout(ratio, comp) {
        try {
            const first = E(l(comp.base).split('|')[0]).tags.split(',').map((t) => cut(t.trim(), 40)).filter(Boolean).slice(0, 3).join(', ');
            if (first) { meta().lastImg = { r: RATIOS.indexOf(ratio) >= 0 ? ratio : '', h: first, at: now() }; saveMeta(); }
        } catch (e) { }
    }

    // ---------------------------------------------------------------- контекст: история + цель
    function storyContext(ctxN, targetMesId) {
        const cc = ctx();
        const chat = cc.chat || [];
        const personaNm = personaName();
        let target = null;
        if (targetMesId !== null && targetMesId !== undefined) target = chat[Number(targetMesId)] || null;
        if (!target && targetMesId !== null && targetMesId !== undefined) return { story: '', target: '', targetId: null };
        if (!target) { const arr = chat.filter((m) => !m.is_user && !m.is_system); target = arr[arr.length - 1] || null; }
        const idx = target ? chat.indexOf(target) : -1;
        const story = (idx >= 0 ? chat.slice(Math.max(0, idx - ival(ctxN, 4, 0, 20)), idx) : [])
            .filter((m) => !m.is_system)
            .map((m) => (m.is_user ? personaNm : l(m.name).trim() || 'Character') + ': ' + cut(plainify(m.mes), 1200))
            .join('\n\n');
        return { story, target: target ? cut(plainify(target.mes), 3500) : '', targetId: target ? chat.indexOf(target) : null };
    }
    // описания карточек персонажей (для референсов LLM)
    function cardTexts() {
        const cc = ctx();
        const parts = [];
        try {
            const seen = {};
            for (const m of cc.chat) {
                if (m.is_user || m.is_system) continue;
                const nm = l(m.name).trim();
                if (!nm || seen[nm]) continue;
                seen[nm] = 1;
                const ch = (cc.characters || []).filter((x) => x && l(x.name).trim() === nm)[0];
                if (ch && ch.description) parts.push('[' + nm + ']\n' + cut(plainify(ch.description), 1500));
            }
        } catch (e) { }
        try {
            const pd = personaDesc();
            if (pd) parts.push('[' + personaName() + ' — user persona]\n' + cut(plainify(pd), 900));
        } catch (e) { }
        return parts.join('\n\n');
    }
    function personaDesc() {
        const cc = ctx();
        try {
            const ps = cc.personas;
            const av = cc.userAvatar;
            if (ps && av && ps[av] !== undefined) {
                const v = ps[av];
                if (typeof v === 'string') return v;
                if (v && typeof v === 'object') return v.description || v.text || '';
            }
        } catch (e) { }
        return '';
    }

    // ---------------------------------------------------------------- LLM-запросы (писатель «api»)
    const PLATFORMS = [
        ['openai', 'OpenAI-compatible', 'https://api.openai.com/v1'],
        ['gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta'],
        ['anthropic', 'Anthropic Claude', 'https://api.anthropic.com/v1'],
    ];
    function findConn(id) { return (S().api.list || []).filter((x) => x.id === id)[0] || null; }
    function llmCall(conn, key, system, user, maxTokens) {
        if (!conn) return Promise.reject(mkErr('cfg', 'Не выбрано API-подключение (вкладка «API»)'));
        if (!key) return Promise.reject(mkErr('cfg', 'У подключения нет ключа'));
        const base = l(conn.base || (PLATFORMS.filter((p) => p[0] === conn.platform)[0] || [])[2]).replace(/\/+$/, '');
        if (!isHttps(base)) return Promise.reject(mkErr('cfg', 'Адрес подключения должен быть HTTPS'));
        if (!conn.model) return Promise.reject(mkErr('cfg', 'У подключения не задана модель'));
        maxTokens = maxTokens || 2000;
        let url, headers, body, extract;
        if (conn.platform === 'gemini') {
            url = base + '/models/' + encodeURIComponent(l(conn.model).replace(/^models\//, '')) + ':generateContent';
            headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
            body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } };
            extract = (j) => { const t = j && j.candidates && j.candidates[0]; return t && t.content && t.content.parts ? t.content.parts.map((p) => l(p.text)).join('') : ''; };
        } else if (conn.platform === 'anthropic') {
            url = base + '/messages';
            headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
            body = { model: conn.model, max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: user }] };
            extract = (j) => (j && Array.isArray(j.content) ? j.content.filter((p) => p.type === 'text').map((p) => l(p.text)).join('') : '');
        } else {
            url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
            headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key };
            body = { model: conn.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7, max_tokens: maxTokens };
            extract = (j) => { const ch = j && j.choices && j.choices[0]; let t = ch && (ch.message || ch.delta) ? ch.message ? ch.message.content : ch.delta.content : ''; if (Array.isArray(t)) t = t.map((p) => l(p.text)).join(''); return l(t); };
        }
        return fetchT(url, { method: 'POST', headers: headers, body: JSON.stringify(body) }, 120000).then((res) => res.text().then((txt) => {
            if (!res.ok) throw httpErr(res, txt, 'LLM');
            let j = null; try { j = JSON.parse(txt); } catch (e) { }
            const out = j ? extract(j) : '';
            if (!out.trim()) throw mkErr('http', 'LLM вернул пустой ответ');
            return out;
        }));
    }

    // писатель «api»: сам придумывает маркер по шаблону
    function apiWrite(targetMesId, stage) {
        const s = S();
        const tpl = activePrompt(s);
        if (!tpl || !l(tpl.text).trim()) return Promise.reject(mkErr('cfg', 'Шаблон промпта пустой (вкладка «Пресеты»)'));
        const conn = findConn(s.apiId);
        const looks = collectLooks();
        if (stage) stage('Пишу промпт (LLM)…');
        return Promise.resolve().then(() => {
            const ctxs = storyContext(s.ctxN, targetMesId);
            const cards = s.refs ? cardTexts() : '';
            const system = l(tpl.text).trim() + '\n\nENGINE LABELS: start every character block with "@Name," using the exact name from the CHARACTERS list, or "@other," for anyone else. The engine strips these labels before drawing.\nOutput ONLY the single marker line [SCENE: RATIO | PROMPT] and nothing else.';
            const userParts = [
                cards ? 'CHARACTER CARDS:\n' + cards : '',
                charsList(looks),
                ctxs.story ? 'STORY SO FAR (oldest first):\n' + ctxs.story : '',
                'REPLY TO ILLUSTRATE:\n' + (ctxs.target || '(empty)'),
                prevImageHint(tpl.kind),
                'Now output the single [SCENE: ...] marker line for this reply.',
            ].filter(Boolean).join('\n\n');
            return llmCall(conn, conn ? conn.key : '', system, userParts).then((txt) => {
                const mk = findMarker(txt);
                if (!mk) throw mkErr('nomarker', 'LLM не выдал маркер [SCENE: ...]. Ответ: ' + cut(l(txt).replace(/\s+/g, ' '), 200));
                return { ratio: mk.ratio, desc: mk.desc };
            });
        });
    }

    // писатель «chat»: отдельный фоновый запрос к выбранной в Таверне модели
    async function chatWrite(targetMesId, stage) {
        const s=S(), tpl=activePrompt(s);
        if (!tpl || !l(tpl.text).trim()) throw mkErr('cfg','Шаблон промпта пустой (вкладка «Пресеты»)');
        const cc=ctx();
        let quiet=cc.generateQuietPrompt;
        if (typeof quiet!=='function' && typeof window.generateQuietPrompt==='function') quiet=window.generateQuietPrompt;
        if (typeof quiet!=='function') {
            try { const mod=await import('/script.js'); quiet=mod.generateQuietPrompt; } catch(e) { }
        }
        if (typeof quiet!=='function') throw mkErr('cfg','Модель чата недоступна для отдельного запроса. Обнови SillyTavern или выбери «Своё API».');
        const looks=collectLooks(), ctxs=storyContext(s.ctxN,targetMesId), cards=s.refs?cardTexts():'';
        const system=l(tpl.text).trim()+'\n\nENGINE LABELS: start every character block with "@Name," using the exact name from the CHARACTERS list, or "@other," for anyone else. The engine strips these labels before drawing.\nOutput ONLY the single marker line [SCENE: RATIO | PROMPT] and nothing else.';
        const userParts=[cards?'CHARACTER CARDS:\n'+cards:'',charsList(looks),ctxs.story?'STORY SO FAR (oldest first):\n'+ctxs.story:'','REPLY TO ILLUSTRATE:\n'+(ctxs.target||'(empty)'),prevImageHint(tpl.kind),'Now output the single [SCENE: ...] marker line for this reply.'].filter(Boolean).join('\n\n');
        if (stage) stage('Пишу промпт моделью чата…');
        const txt=await quiet({quietPrompt:system+'\n\n'+userParts});
        const mk=findMarker(txt);
        if (!mk) throw mkErr('nomarker','Модель чата не выдала маркер [SCENE: ...]. Ответ: '+cut(l(txt).replace(/\s+/g,' '),200));
        return {ratio:mk.ratio,desc:mk.desc};
    }

    // инъекция инструкций в промпт Таверны (inline-писатель)
    function inlineInjection(data) {
        try {
            if (!data || !Array.isArray(data.prompt)) return;
            const s = S();
            if (s.mode === 'off' || s.writer !== 'inline' || data.dryRun) return;
            const chat = ctx().chat || [];
            if (!chat.length || !chat[chat.length - 1].is_user) return; // только при ответе персонажа
            const tpl = activePrompt(s);
            if (!tpl || !l(tpl.text).trim()) return;
            const looks = collectLooks();
            const parts = ['<scene_image_instructions>', l(tpl.text).trim()];
            if (s.refs && looks.length) {
                parts.push('ENGINE LABELS: start every character block with "@Name," using the exact name from the CHARACTERS list, or "@other," for anyone else. The engine strips these labels before drawing. If an appearance is listed, use those tags for that character.');
                parts.push(charsList(looks));
            }
            parts.push('HTML comments like <!--scene:...--> in the chat history are technical anchors of an image plugin: ignore them and never write them yourself.');
            parts.push('</scene_image_instructions>');
            data.prompt.push({ role: 'system', content: parts.join('\n\n') });
        } catch (e) { console.warn('[sharkimage] inline injection', e); }
    }

    // ---------------------------------------------------------------- сохранение картинки в Таверну
    const splitData = (d) => { const m = /^data:([^;]+);base64,(.*)$/s.exec(d || ''); return m ? { mime: m[1], b64: m[2].replace(/\s+/g, '') } : null; };
    async function uploadImage(dataUrl, name) {
        const x = splitData(dataUrl);
        if (!x) throw mkErr('badimg', 'Пустая картинка');
        const fmt = (x.mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const r = await fetch('/api/images/upload', { method: 'POST', headers: ctx().getRequestHeaders(), body: JSON.stringify({ image: x.b64, format: fmt, ch_name: 'sharkimage', filename: name }) });
        if (!r.ok) throw new Error('Не удалось сохранить картинку в таверне (' + r.status + ')');
        return (await r.json()).path;
    }
    const toUrl = (u) => (/^(https?:|data:)/.test(l(u)) ? u : (u ? '/' + l(u).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/') : ''));

    // ---------------------------------------------------------------- сцены в метаданных чата
    function sceneOf(mesId) {
        const sc = meta().scenes;
        const k = String(mesId);
        if (!sc[k]) sc[k] = { id: uid(), status: '', vars: [], idx: -1, last: null, err: '', stage: '' };
        return sc[k];
    }
    function dropScene(mesId) { delete meta().scenes[String(mesId)]; saveMeta(); }

    // ---------------------------------------------------------------- мемо: запомнить внешность по картинке
    const MEMO_RX = /\b(hair|bangs|ponytails?|twintails|braids?|braided|hair bun|bob cut|hime cut|ahoge|sidelocks|undercut|buzz cut|bald|eyes|heterochromia|skin|skinned|freckles|moles?|beauty mark|scars?|tattoos?|glasses|eyepatch|piercings?|fangs?|ears|horns?|tails?|wings|halo|beard|mustache|stubble|facial hair|muscular|slender|slim|curvy|petite|tall|chubby|plump|athletic|broad shoulders|toned|makeup|lipstick|eyeliner|eyeshadow|eyelashes|flat chest|(?:small|medium|large|huge) breasts)\b/;
    const MEMO_SKIP = /#|^(closed|half-closed|half-open|narrowed|wide|teary|tearful|rolling|rolled|covered|empty|blank|dull|sparkling|shining|crying|wet|messy|disheveled|floating|flowing|tousled|glowing|sleepy|tired|bloodshot|heart-shaped|spiral) |hand|finger|touch|grab|pull|tuck|adjust|hold|look|cover|wip|rub|through|hair (down|up|over|blowing|flowing)|motion|sweat|blush|tears|eyes closed/;
    function memoFromTags(text) {
        const out = [];
        l(text).split(',').forEach((t) => {
            const n = normTag(t);
            if (!n || n.length > 40) return;
            if (/^(girl|boy|other)$/.test(n)) return;
            if (/(left|right) side|^center$|foreground|background/.test(n)) return;
            if (MEMO_RX.test(n) && !MEMO_SKIP.test(n) && out.indexOf(n) < 0) out.push(n);
        });
        return out.slice(0, 14);
    }
    function applyMemo(comp, looks) {
        const s = S();
        if (!s.memo || !comp.match || !comp.match.length) return;
        let changed = false;
        comp.match.forEach((mt) => {
            const lk = looks[mt.i];
            if (!lk || l(lk.app).trim()) return;
            const tags = memoFromTags(mt.t);
            if (tags.length < 2) return;
            lk.app = tags.join(', ');
            lk.auto = 1;
            if (!lk.g) lk.g = genderFrom(mt.t) || '';
            saveLook(lk);
            changed = true;
        });
        if (changed) toast('success', 'Внешность запомнена по первой картинке ✨');
    }

    // ---------------------------------------------------------------- генерация
    const busy = new Map(); // mesId -> {stage, t0}
    let abortCtl = null;
    const STAGE_TXT = { llm: 'Пишу промпт (LLM)…', nai: 'Рисую в NovelAI…', proxy: 'Рисую через прокси…', ns: 'Рисую в Naistera…', wait429: 'Сервер занят (429), жду…', save: 'Сохраняю…' };
    function setStage(mesId, stage) { const b = busy.get(Number(mesId)); if (b) { b.stage = stage; b.ts = now(); } renderBars(); }
    const stageFn = (mesId) => (st) => setStage(mesId, STAGE_TXT[st] || st);

    async function run(mesId, opts) {
        opts = opts || {};
        const s = S();
        if (busy.size) { toast('info', 'Уже идёт генерация — подожди или нажми «Стоп»'); return; }
        const msg = ctx().chat[mesId];
        if (!msg) return;
        busy.set(Number(mesId), { stage: 'Подготовка…', t0: now(), ts: now() });
        abortCtl = new AbortController();
        renderBars();
        try {
            const sc = sceneOf(mesId);
            sc.status = 'pending'; sc.err = ''; sc.stage = '';
            // 1) промпт: маркер из сообщения или LLM-писатель
            let ratio = '', desc = '';
            const marker = findMarker(msg.mes || '');
            if (opts.prompt) { desc = opts.prompt; ratio = opts.ratio || (marker ? marker.ratio : '3:2'); }
            else if (marker && !opts.rewrite) { ratio = marker.ratio; desc = marker.desc; }
            else if (s.writer !== 'inline' || opts.rewrite || !marker) {
                const mk = s.writer === 'api' ? await apiWrite(mesId, stageFn(mesId)) : await chatWrite(mesId, stageFn(mesId));
                ratio = mk.ratio; desc = mk.desc;
            }
            if (!desc) throw mkErr('noprompt', 'Не удалось получить промпт сцены');
            // 2) композиция
            const looks = collectLooks();
            const style = activeStyle(s), neg = activeNeg(s);
            let styleTags = style ? w(style.tags) : '';
            let negUser = neg ? w(neg.text) : '';
            const comp = compose(desc, looks);
            if (s.provider === 'nai' || s.provider === 'naiproxy') {
                if (styleTags) comp.base = w(styleTags + ', ' + comp.base);
            }
            styleTags = applyGuards(comp, styleTags);
            if (comp.guard) negUser = xmerge(negUser, comp.gneg);
            if (abortCtl.signal.aborted) throw mkErr('abort', 'Остановлено');
            // 3) провайдер
            const seed = Math.floor(4294967295 * Math.random());
            const token = s.provider === 'naistera' ? s.nsToken : s.naiToken;
            let res;
            if (s.provider === 'nai') res = await naiGenerate(s.nai, token, comp, negUser, seed, ratio, stageFn(mesId));
            else if (s.provider === 'naiproxy') res = await proxyGenerate(s, token, comp, negUser, seed, ratio, styleTags, stageFn(mesId));
            else res = await nsGenerate(s, token, comp, negUser, seed, ratio, styleTags, stageFn(mesId));
            if (abortCtl.signal.aborted) throw mkErr('abort', 'Остановлено');
            // 4) сохранить
            setStage(mesId, 'save');
            const path = await uploadImage(res.data, 'shark_' + now().toString(36) + '_' + uid());
            const variant = {
                f: path, seed: seed, at: now(), p: s.provider,
                m: s.provider === 'naistera' ? 'ns:' + s.ns.model : s.nai.model,
                w: res.w, h: res.h,
                style: style ? w(style.tags) : '',
                steps: s.provider === 'naistera' ? 0 : (isMedium(s.nai.model) ? 14 : s.nai.steps),
                scale: s.provider === 'naistera' ? 0 : s.nai.scale,
            };
            sc.vars.push(variant);
            sc.idx = sc.vars.length - 1;
            sc.last = { base: cut(res.req.base, 3000), chars: (res.req.chars || []).map((t) => cut(t, 800)), neg: cut(res.req.neg, 1500), hit: Object.keys(comp.hit) };
            sc.status = 'done'; sc.err = ''; sc.stage = '';
            saveMeta();
            // мемо
            try { applyMemo(comp, looks); } catch (e) { console.warn('[sharkimage] memo', e); }
            try { rememberLayout(ratio, comp); } catch (e) { }
            // якорь в текст сообщения (чтобы сцена не терялась при редактировании)
            try {
                if (l(msg.mes).indexOf(anchor(sc.id)) < 0) {
                    msg.mes = l(msg.mes).trimEnd() + '\n' + anchor(sc.id);
                    saveMeta();
                }
            } catch (e) { }
            attachMedia(mesId);
            toast('success', 'Картинка готова ✨');
        } catch (e) {
            if (e && e.code === 'abort') {
                toast('info', 'Генерация остановлена');
            } else {
                const sc = sceneOf(mesId);
                sc.status = 'error'; sc.err = l(e && e.message ? e.message : e).slice(0, 300); sc.stage = '';
                saveMeta();
                toast('error', 'Не вышло: ' + sc.err);
            }
        } finally {
            busy.delete(Number(mesId));
            abortCtl = null;
            renderBars();
        }
    }

    function attachMedia(mesId) {
        const cc = ctx();
        const msg = cc.chat[mesId];
        const sc = sceneOf(mesId);
        const v = sc.vars[sc.idx];
        if (!msg || !v) return;
        if (!msg.extra || typeof msg.extra !== 'object') msg.extra = {};
        if (!Array.isArray(msg.extra.media)) msg.extra.media = [];
        if (!msg.extra.media.length) { msg.extra.media_display = 'gallery'; msg.extra.inline_image = false; }
        // убрать старые записи sharkimage для этого сообщения, добавить новую
        msg.extra.media = msg.extra.media.filter((m) => !m || m.source !== 'sharkimage');
        msg.extra.media.push({
            url: toUrl(v.f), type: 'image', source: 'sharkimage',
            title: sc.last ? sc.last.base : '',
            shark: { seed: v.seed, model: v.m, provider: v.p },
        });
        msg.extra.media_index = msg.extra.media.length - 1;
        try { if (Array.isArray(msg.swipe_info) && msg.swipe_info[msg.swipe_id] && typeof msg.swipe_info[msg.swipe_id] === 'object') msg.swipe_info[msg.swipe_id].extra = deep(msg.extra); } catch (e) { }
        try { cc.saveChat(); } catch (e) { }
        renderBars();
    }
    function showVariant(mesId, d) {
        const msg = ctx().chat[mesId];
        const sc = sceneOf(mesId);
        if (!msg || !sc.vars.length) return;
        sc.idx = (ival(sc.idx, 0, 0, sc.vars.length - 1) + d + sc.vars.length) % sc.vars.length;
        saveMeta();
        attachMedia(mesId);
    }
    function downloadVariant(mesId) {
        const sc = sceneOf(mesId);
        const v = sc.vars[ival(sc.idx, 0, 0, Math.max(0, sc.vars.length - 1))];
        if (!v) return;
        const a = document.createElement('a');
        a.href = toUrl(v.f);
        a.download = 'shark_' + (v.seed || now()) + '.png';
        document.body.appendChild(a); a.click(); a.remove();
    }

    // ---------------------------------------------------------------- подсветка кнопок/статуса под сообщением
    const fmtSec = (ms) => { const s = Math.floor(ms / 1000); return (s >= 60 ? Math.floor(s / 60) + 'м ' : '') + (s % 60) + 'с'; };
    let barsTimer = null;
    function renderBars() { clearTimeout(barsTimer); barsTimer = setTimeout(renderBarsNow, 30); }
    function renderBarsNow() {
        const s = S();
        const cc = ctx();
        document.querySelectorAll('#chat .mes').forEach((mesEl) => {
            const id = Number(mesEl.getAttribute('mesid'));
            const msg = cc.chat[id];
            const oldLegacy = mesEl.querySelector('.shk-bar');
            if (oldLegacy) oldLegacy.remove();
            let card = mesEl.querySelector(':scope > .shk-card') || mesEl.querySelector('.shk-card');
            if (!msg || msg.is_user || msg.is_system) {
                if (card) card.remove();
                mesEl.classList.remove('shk-tavo-card');
                return;
            }
            const sc = meta().scenes[String(id)];
            const marker = findMarker(msg.mes || '');
            const b = busy.get(id);
            const errTxt = sc && sc.status === 'error' ? sc.err : '';
            const canDraw = s.mode !== 'off' || (sc && sc.vars && sc.vars.length);
            const needsDraw = marker && canDraw && (!sc || sc.status !== 'done');
            const needsWriter = (s.writer === 'api' || s.writer === 'chat') && s.mode !== 'off' && !marker && (!sc || !sc.vars || !sc.vars.length);
            const hasImage = !!(sc && sc.vars && sc.vars.length);
            if (!b && !needsDraw && !needsWriter && !hasImage && !errTxt) {
                if (card) card.remove();
                mesEl.classList.remove('shk-tavo-card');
                return;
            }
            const ib = (act, ic, title, cls) => `<button type="button" class="sci-b shk-b${cls ? ' ' + cls : ''}" data-act="${act}" title="${esc(title)}" aria-label="${esc(title)}">${icon4(ic)}</button>`;
            let media = '', caption = '';
            if (b) {
                media = `<div class="sci-busy"><span class="sci-st">${esc(b.stage || 'Работаю…')} · <span class="shk-timer" data-t0="${b.t0}">${fmtSec(now() - b.t0)}</span></span></div><div class="sci-bar">${ib('stop','close','Стоп','sci-danger')}</div>`;
            } else if (hasImage) {
                const n = sc.vars.length;
                const vi = ival(sc.idx, 0, 0, n - 1);
                const v = sc.vars[vi];
                const styleRec = lib().styles.filter((x) => w(x.tags) === w(v.style))[0];
                media = `<img class="sci-img shk2-fallback-img shk-b" data-act="zoom" src="${esc(toUrl(v.f))}" alt="scene" loading="lazy">`
                    + (n > 1 ? ib('prev','left','Предыдущий вариант','sci-nav sci-prev') + ib('next','right','Следующий вариант','sci-nav sci-next') : '')
                    + `<div class="sci-bar">${ib('more','plus','Ещё вариант')}${ib('prompt','edit','Промпт')}${ib('info','info','Подробности')}${ib('dl','down','Скачать')}${ib('del','trash','Удалить вариант')}</div>`;
                caption = `<div class="sci-lab"><span class="sci-labs">${esc(styleRec ? styleRec.name : 'Shark Image')}</span><span class="sci-labn"> · ${vi + 1} / ${n}</span></div>`;
            } else {
                const act = marker ? 'draw' : 'drawapi';
                const preview = marker && marker.desc ? marker.desc : 'Промпт напишет модель';
                media = `<div class="sci-ph"><button type="button" class="sci-draw shk-b" data-act="${act}">${icon4('img')}<span>Нарисовать</span></button><span class="sci-pv">${esc(preview)}</span></div>`;
            }
            if (errTxt && !b) media += `<div class="sci-err"><span>${esc(errTxt)}</span><div class="sci-row"><button type="button" class="sci-pill shk-b" data-act="${hasImage ? 'more' : marker ? 'draw' : 'drawapi'}">${icon4('redo')}Повторить</button><button type="button" class="sci-pill sci-ghost shk-b" data-act="settings">${icon4('gear')}Настройки</button></div></div>`;
            const currentFile = hasImage ? sc.vars[ival(sc.idx,0,0,sc.vars.length-1)].f : '';
            const key = (b ? 'b' + b.stage + b.ts : 'i') + '|' + (errTxt || '') + '|' + (sc && sc.vars ? sc.vars.length + ':' + sc.idx + ':' + currentFile : '') + '|' + (marker ? h36(marker.desc) : '') + '|' + s.mode + s.writer + resolvedTheme4();
            if (card && card.dataset.k === key) return;
            if (card) card.remove();
            card = document.createElement('div');
            card.className = 'sci-card shk-card shk2-img';
            card.dataset.k = key;
            card.setAttribute('data-sci-theme', resolvedTheme4());
            card.setAttribute('data-sci-chat', 'dark');
            card.innerHTML = `<div class="sci-media">${media}</div>${caption}`;
            const mt = mesEl.querySelector('.mes_text');
            if (mt) mt.after(card); else mesEl.appendChild(card);
            mesEl.classList.add('shk-tavo-card');
            localize4(card);
        });
        hideMarkers();
    }
    setInterval(() => { document.querySelectorAll('#chat .shk-timer').forEach((el) => { el.textContent = fmtSec(now() - Number(el.dataset.t0)); }); }, 500);

    // скрыть маркеры и якоря в отображаемых сообщениях
    function hideMarkers() {
        const RGX = /\[(?:[A-ZА-ЯЁ]{2,24}_)?SCENE:\s*[^\]]*?\s*\]|<!--scene:[a-z0-9]{4,40}-->/g;
        document.querySelectorAll('#chat .mes').forEach(function (mesEl) {
            const root = mesEl.querySelector('.mes_text');
            if (!root || root.dataset.shkClean) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) { if (RGX.test(n.nodeValue)) nodes.push(n); RGX.lastIndex = 0; }
            nodes.forEach((node) => {
                const frag = document.createDocumentFragment();
                let last = 0, m;
                RGX.lastIndex = 0;
                while ((m = RGX.exec(node.nodeValue))) {
                    if (m.index > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
                    const sp = document.createElement('span');
                    sp.className = 'shk-hidden-marker';
                    sp.textContent = m[0];
                    frag.appendChild(sp);
                    last = m.index + m[0].length;
                }
                if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
                node.parentNode.replaceChild(frag, node);
            });
            if (nodes.length) root.dataset.shkClean = '1';
        });
    }
    const unhideMarkers = (mesId) => {
        const el = document.querySelector(`#chat .mes[mesid="${mesId}"] .mes_text`);
        if (el) { delete el.dataset.shkClean; hideMarkers(); }
    };

    // ---------------------------------------------------------------- модалки
    function modal(html) {
        const w = document.createElement('div');
        w.className = 'shk-overlay';
        w.innerHTML = `<div class="shk-modal">${html}</div>`;
        document.body.appendChild(w);
        return w;
    }
    function promptBox(mesId) {
        const sc = sceneOf(mesId);
        const mk = findMarker(ctx().chat[mesId].mes || '');
        const cur = sc.last;
        const curText = cur ? [cur.base].concat(cur.chars || []).join(' | ') : (mk ? mk.desc : '');
        const w = modal(`<div class="shk-mh">Промпт сцены</div>
            <div class="shk-mrow"><span>Формат: <code>RATIO | база | @Имя, теги персонажа | …</code></span></div>
            <textarea id="shk_prompt" class="shk-ta" rows="7">${esc(curText)}</textarea>
            <div class="shk-mbtns">
                <div class="menu_button shk-b" data-x="save">Перерисовать с этим промптом</div>
                <div class="menu_button shk-b" data-x="close">Закрыть</div>
            </div>`);
        w.addEventListener('click', (e) => { if (e.target === w) w.remove(); });
        w.querySelector('[data-x="close"]').onclick = () => w.remove();
        w.querySelector('[data-x="save"]').onclick = () => {
            const t = w.querySelector('#shk_prompt').value.trim();
            w.remove();
            if (t) run(mesId, { prompt: t });
        };
    }
    function infoBox(mesId) {
        const sc = sceneOf(mesId);
        const v = sc.vars[ival(sc.idx, 0, 0, Math.max(0, (sc.vars || []).length - 1))];
        const cur = sc.last || {};
        const looks = collectLooks();
        const hitNames = (cur.hit || []).map((k) => { const lk = looks.filter((x) => x.key === k)[0]; return lk ? lk.name : k; });
        const w = modal(`<div class="shk-mh">Инфо о генерации</div>
            <div class="shk-info">
            <div><b>Модель:</b> ${esc(v ? v.m : '—')}</div>
            <div><b>Сид:</b> ${esc(v ? v.seed : '—')}</div>
            <div><b>Размер:</b> ${esc(v ? (v.w + '×' + v.h) : '—')}</div>
            ${v && v.steps ? `<div><b>Шаги/гиданс:</b> ${esc(v.steps)} / ${esc(v.scale)}</div>` : ''}
            ${hitNames.length ? `<div><b>Внешности применены:</b> ${esc(hitNames.join(', '))}</div>` : ''}
            <div class="shk-infop"><b>База:</b><br>${esc(cur.base || '—')}</div>
            ${(cur.chars || []).map((t, i) => `<div class="shk-infop"><b>Персонаж ${i + 1}:</b><br>${esc(t)}</div>`).join('')}
            <div class="shk-infop"><b>Негатив:</b><br>${esc(cur.neg || '—')}</div>
            </div>
            <div class="shk-mbtns"><div class="menu_button shk-b" data-x="close">Закрыть</div></div>`);
        w.addEventListener('click', (e) => { if (e.target === w) w.remove(); });
        w.querySelector('[data-x="close"]').onclick = () => w.remove();
    }

    // ---------------------------------------------------------------- действия кнопок
    async function barAction(mesId, act) {
        const s = S();
        if (act === 'stop') { if (abortCtl) { try { abortCtl.abort(); } catch (e) { } } return; }
        if (act === 'draw') return run(mesId);
        if (act === 'drawapi') return run(mesId, { rewrite: true });
        if (act === 'settings') return openShkModal();
        if (act === 'zoom') { const sc=sceneOf(mesId),v=sc.vars[ival(sc.idx,0,0,Math.max(0,sc.vars.length-1))]; if(v) window.open(toUrl(v.f),'_blank','noopener'); return; }
        if (act === 'prev') return showVariant(mesId, -1);
        if (act === 'next') return showVariant(mesId, 1);
        if (act === 'more') {
            const sc = sceneOf(mesId);
            if (sc.last) {
                const mk = findMarker(ctx().chat[mesId].mes || '');
                const t = [sc.last.base].concat(sc.last.chars || []).join(' | ');
                return run(mesId, { prompt: t, ratio: mk ? mk.ratio : '3:2' });
            }
            return run(mesId);
        }
        if (act === 'prompt') return promptBox(mesId);
        if (act === 'info') return infoBox(mesId);
        if (act === 'dl') return downloadVariant(mesId);
        if (act === 'del') { if (confirm('Удалить этот вариант Shark Image?')) { const sc=sceneOf(mesId),vi=ival(sc.idx,0,0,Math.max(0,sc.vars.length-1)); deleteGallery4(mesId,vi); renderBars(); } return; }
    }

    // ---------------------------------------------------------------- панель настроек
    const NAI_MODELS = [
        ['nai-diffusion-5-full', 'NovelAI V5 Full'],
        ['nai-diffusion-5-curated', 'NovelAI V5 Curated'],
        ['nai-diffusion-5-full-medium', 'NovelAI V5 Full · Medium'],
        ['nai-diffusion-4-5-full', 'NovelAI V4.5 Full'],
        ['nai-diffusion-4-5-curated', 'NovelAI V4.5 Curated'],
    ];
    const opt = (v, cur, name) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(name || v)}</option>`;

    // ================= TAVO UI: вкладки панели (дизайн 1:1 оригинал, классы sci-*) =================
    const TABS4 = [['gen', 'spark', 'Главное'], ['look', 'user', 'Герои'], ['lib', 'book', 'Пресеты'], ['gal', 'grid', 'Галерея'], ['api', 'key', 'API']];
    const sec4 = (title, inner, hint) => `<section class="sci-card2">${title ? `<h3>${esc(title)}</h3>` : ''}${hint ? `<p class="sci-hint">${esc(hint)}</p>` : ''}${inner}</section>`;
    const row4 = (label, ctl, hint) => `<div class="sci-f"><span class="sci-fl">${esc(label)}</span>${ctl}${hint ? `<span class="sci-hint">${esc(hint)}</span>` : ''}</div>`;
    const seg4 = (key, pairs, cur) => `<div class="sci-seg" role="radiogroup">${pairs.map((p) => `<button type="button" class="${cur === p[0] ? 'on' : ''}" data-seg="${esc(p[0])}" data-s="${esc(key)}" role="radio">${esc(p[1])}</button>`).join('')}</div>`;
    const sw4 = (label, key, checked, hint) => `<label class="sci-sw"><input type="checkbox" data-s="${esc(key)}" ${checked ? 'checked' : ''}><i></i><span>${esc(label)}</span></label>${hint ? `<p class="sci-hint">${esc(hint)}</p>` : ''}`;
    const sel4 = (key, optionsHtml) => `<select class="sci-in" data-s="${esc(key)}">${optionsHtml}</select>`;
    const in4 = (key, val, type, ph) => `<input class="sci-in" type="${type || 'text'}" data-s="${esc(key)}" value="${esc(val)}" ${ph ? `placeholder="${esc(ph)}"` : ''}>`;
    const btn4 = (label, attrs, ghost) => `<button type="button" class="${ghost ? 'sci-tbtn' : 'sci-pill'}" ${attrs}>${label}</button>`;

    function renderSettings() {
        const s = S();
        const tab = s.tab && TABS4.some((t) => t[0] === s.tab) ? s.tab : 'gen';
        return tab === 'gen' ? tabMain() : tab === 'look' ? tabLooks() : tab === 'lib' ? tabPresets() : tab === 'gal' ? tabGallery() : tabApi();
    }

    function tabMain() {
        const s = S();
        const fam = provFamily(s);
        const naiBlock = sec4('Настройки NovelAI',
            row4('Модель', sel4('nai.model', NAI_MODELS.map((m) => opt(m[0], s.nai.model, m[1])).join(''))) +
            row4('Размер', sel4('nai.size', opt('small', s.nai.size, 'Малый') + opt('normal', s.nai.size, 'Обычный') + opt('big', s.nai.size, 'Большой'))) +
            row4('Качество', sel4('nai.quality', opt('standard', s.nai.quality, 'Стандарт') + opt('light', s.nai.quality, 'Лёгкое') + opt('none', s.nai.quality, 'Без тегов'))) +
            row4('Негатив (UC)', sel4('nai.uc', opt('heavy', s.nai.uc, 'Сильный') + opt('light', s.nai.uc, 'Лёгкий') + opt('human', s.nai.uc, 'Люди') + opt('none', s.nai.uc, 'Без пресета'))) +
            row4('Шаги', in4('nai.steps', s.nai.steps, 'number')) +
            row4('Гиданс', in4('nai.scale', s.nai.scale, 'number')) +
            row4('Сэмплер', sel4('nai.sampler', ['k_euler_ancestral', 'k_euler', 'k_dpmpp_2s_ancestral', 'k_dpmpp_2m_sde_ancestral', 'k_dpmpp_2m', 'k_dpmpp_sde', 'ddim'].map((v) => opt(v, s.nai.sampler)).join(''))) +
            row4('Шум', sel4('nai.noise', ['karras', 'exponential', 'polyexponential'].map((v) => opt(v, s.nai.noise)).join(''))));
        const nsBlock = sec4('Настройки Naistera',
            row4('Модель', in4('ns.model', s.ns.model, 'text', 'novelai-v4.5')) +
            row4('Качество', sel4('ns.quality', opt('standard', s.ns.quality, 'Стандарт') + opt('light', s.ns.quality, 'Лёгкое') + opt('none', s.ns.quality, 'Без тегов'))) +
            sw4('Негатив для «medium»', 'nsMediumNeg', !(s.ns.cat || []).some((c) => c.id === s.ns.model), 'По умолчанию у medium-моделей негатив отключён — как в оригинале'));
        const tplSel = s.writer === 'inline'
            ? row4('Шаблон промпта', sel4(FAM[fam].tpl, lib().prompts.filter((p) => kindOk(p.kind, fam)).map((p) => opt(p.id, s[FAM[fam].tpl], p.name)).join('')), 'Инструкция добавляется только в запрос — в чате её не видно. Модель дописывает в конец ответа скрытый маркер сцены.')
            : row4('Шаблон промпта', sel4(FAM[fam].tpl, lib().prompts.filter((p) => kindOk(p.kind, fam)).map((p) => opt(p.id, s[FAM[fam].tpl], p.name)).join('')));
        const connRow = s.writer === 'api'
            ? row4('Подключение', s.api.list.length
                ? sel4('apiId', s.api.list.map((c) => opt(c.id, s.apiId, (c.name || 'Подключение') + ' · ' + (c.model || ''))).join(''))
                : `<span class="sci-hint">Подключений пока нет.</span> ${btn4('Добавить', 'data-gotoapi="1"', true)}`)
            : '';
        return ''
            + sec4('Когда рисовать', seg4('mode', [['auto', 'Авто'], ['manual', 'Вручную'], ['off', 'Выкл']], s.mode)
                + `<p class="sci-hint">${esc({ auto: 'Каждый новый ответ получает картинку сразу. Старые сообщения не перерисовываются.', manual: 'Под ответом появляется кнопка «Нарисовать» — Anlas тратятся только по нажатию.', off: 'Плагин ничего не добавляет в ответы. Уже готовые картинки остаются на месте.' }[s.mode])}</p>`)
            + sec4('Кто пишет промпт', sel4('writer', opt('inline', s.writer, 'Модель чата — прямо в ответе') + opt('chat', s.writer, 'Модель чата — отдельный запрос') + opt('api', s.writer, 'Своё API (отдельная модель)'))
                + `<p class="sci-hint">${esc(s.writer === 'inline' ? 'Самый экономный: модель дописывает в конец ответа скрытый маркер сцены. Инструкция добавляется только в запрос, в чате её не видно.' : s.writer === 'chat' ? 'После ответа модель чата отдельным запросом пишет промпт. Текст ответа остаётся чистым.' : 'Промпт пишет ваша модель из вкладки API — независимо от модели чата.')}</p>` + connRow)
            + sec4('Где рисовать', sel4('provider', opt('nai', s.provider, 'NovelAI (свой токен)') + opt('naiproxy', s.provider, 'Прокси NovelAI') + opt('naistera', s.provider, 'Naistera')) + tplSel
                + row4('Активный стиль', sel4(FAM[fam].style, lib().styles.filter((p) => p.fam === fam).map((p) => opt(p.id, s[FAM[fam].style], p.name)).join('')))
                + row4('Активный негатив', sel4(FAM[fam].neg, lib().negs.filter((p) => p.fam === fam).map((p) => opt(p.id, s[FAM[fam].neg], p.name)).join(''))))
            + (s.provider === 'naistera' ? nsBlock : naiBlock)
            + sec4('Дополнительно', row4('Сообщений контекста', in4('ctxN', s.ctxN, 'number'))
                + sw4('Передавать модели внешность и описания персонажей', 'refs', s.refs)
                + sw4('Запоминать внешность с первой картинки', 'memo', s.memo, 'Если у героя внешность не задана, плагин запомнит, каким он получился на первой картинке, и дальше будет рисовать так же. Поправить можно во вкладке «Герои».'));
    }

    function tabLooks() {
        const looks = collectLooks();
        const kindName = (k) => k === 'u' ? 'Ваша персона' : k === 'n' ? 'NPC' : 'Персонаж';
        const rows = looks.map((lk) => sec4(null, `
            <div class="shk-look" data-key="${esc(lk.key)}" data-kind="${lk.kind}" data-id="${esc(lk.id)}" data-name="${esc(lk.name)}">
                <h3 class="sci-name">${esc(lk.name)} <span class="sci-hint">${kindName(lk.kind)}</span>${lk.auto ? ' <span class="sci-hint" title="запомнено автоматически">🤖 запомнено</span>' : ''}</h3>
                ${lk.kind === 'c' ? btn4('Заполнить из карточки', `data-look-fill="${esc(lk.key)}"`, true) : ''}
                ${row4('Внешность', `<textarea class="sci-in shk-ta" rows="3" data-look="app" placeholder="long black hair, golden eyes, tall, pale skin…">${esc(lk.app)}</textarea>`)}
                ${row4('Одежда', `<input class="sci-in" type="text" data-look="cloth" value="${esc(lk.cloth)}" placeholder="white hanfu, silver hairpin…">`)}
                ${row4('Пол', `<select class="sci-in" data-look="g">${opt('', lk.g, '—') + opt('girl', lk.g, 'girl') + opt('boy', lk.g, 'boy') + opt('other', lk.g, 'other')}</select>`, 'Помогает найти персонажа в сцене, если имя не написано.')}
                ${row4('Как зовут в сцене', `<input class="sci-in" type="text" data-look="alias" value="${esc(lk.alias)}" placeholder="англ. имя, прозвища через запятую">`, 'Если модель пишет имя иначе — например, латиницей.')}
                ${row4('Негатив персонажа', `<input class="sci-in" type="text" data-look="neg" value="${esc(lk.neg)}" placeholder="short hair, glasses…">`, 'Только для NovelAI V4.5 / V5: применяется к этому персонажу.')}
                ${btn4('Сохранить', `data-look-save="${esc(lk.key)}"`)}
            </div>`)).join('');
        return `<p class="sci-hint">Теги на английском. Внешность добавляется к блоку нужного героя в каждой картинке. Персонажи и персона хранятся навсегда, NPC — в этом чате.</p>`
            + (rows || sec4(null, '<p class="sci-hint">Откройте чат с персонажем — здесь появятся он и ваша персона.</p>'))
            + sec4('Новый NPC', row4('Имя', '<input class="sci-in" type="text" id="shk_npcname" placeholder="Имя NPC">') + btn4('Добавить NPC', 'data-npc-add="1"'));
    }

    function tabPresets() {
        const s = S();
        const lb = lib();
        const fam = provFamily(s);
        const ed = s.edit || {};
        const cur = (arr, id) => libFind(arr, id) || arr[0] || null;
        const tpl = cur(lb.prompts, ed.tpl);
        const famName = (f) => f === 'v4' ? 'V4' : f === 'v5' ? 'V5' : 'любой';
        const section = (title, arr, kind, curId, edId, extra) => sec4(title, `
            ${row4('Редактировать', `<select class="sci-in" data-ed="${edId}">${arr.map((p) => opt(p.id, curId, p.name + (p.kind ? ' · ' + p.kind : '') + (p.fam ? ' · ' + famName(p.fam) : ''))).join('')}</select>`)}
            ${extra || ''}
            ${row4('Название', `<input class="sci-in" type="text" data-edname="${edId}" value="${esc((arr.filter((p) => p.id === curId)[0] || {}).name || '')}">`)}
            <textarea class="sci-in shk-ta" rows="${kind === 'prompt' ? 10 : 4}" data-edtext="${edId}">${esc((arr.filter((p) => p.id === curId)[0] || {})[kind === 'neg' ? 'text' : 'tags'] || (arr.filter((p) => p.id === curId)[0] || {}).text || '')}</textarea>
            <div class="shk-mbtns">
                ${btn4('Сохранить', `data-preset-save="${edId}" data-kind="${kind}"`)}
                ${btn4('Новый', `data-preset-new="${edId}" data-kind="${kind}"`, true)}
                ${btn4('Дублировать', `data-preset-dup="${edId}" data-kind="${kind}"`, true)}
                ${btn4('Удалить', `data-preset-del="${edId}" data-kind="${kind}"`, true)}
            </div>`);
        return `<p class="sci-hint">Активные для текущего семейства (<b>${fam}</b>): шаблон «${esc((activePrompt(s) || {}).name || '—')}», стиль «${esc((activeStyle(s) || {}).name || '—')}», негатив «${esc((activeNeg(s) || {}).name || '—')}».</p>`
            + section('Промпты', lb.prompts, 'prompt', tpl ? tpl.id : '', 'tpl',
                row4('Тип', `<select class="sci-in" data-edkind="tpl">${KINDS.map((k) => opt(k, tpl ? tpl.kind : 'custom')).join('')}</select>`))
            + section('Стили', lb.styles, 'style', cur(lb.styles, ed.sty) ? cur(lb.styles, ed.sty).id : '', 'sty')
            + section('Негативы', lb.negs, 'neg', cur(lb.negs, ed.neg) ? cur(lb.negs, ed.neg).id : '', 'neg');
    }

    let galView4 = null, galLimit4 = 24;
    function galleryItems4() {
        const sc=meta().scenes||{}, out=[];
        Object.keys(sc).forEach((mid) => {
            const vars=sc[mid]&&sc[mid].vars?sc[mid].vars:[];
            vars.forEach((v,vi) => { if(v&&v.f) out.push({mesId:Number(mid),vi,f:v.f,seed:v.seed,m:v.m,at:v.at||0}); });
        });
        return out.sort((a,b)=>b.at-a.at);
    }
    function tabGallery() {
        const imgs=galleryItems4();
        if (galView4) {
            const it=imgs.filter((x)=>x.mesId===galView4.mesId&&x.vi===galView4.vi)[0];
            if (it) return sec4(null, `<img class="sci-big" data-gal="${esc(toUrl(it.f))}" src="${esc(toUrl(it.f))}" alt=""><p class="sci-hint">${esc(it.m||'Shark Image')}${it.seed?' · Seed '+esc(it.seed):''}</p><div class="sci-row">${btn4(icon4('down')+'Скачать',`data-gal-download="${it.mesId}:${it.vi}"`)}${btn4(icon4('trash')+'Удалить',`data-gal-del="${it.mesId}:${it.vi}"`,true)}</div><div class="sci-row">${btn4(icon4('left')+'Назад','data-gal-back="1"',true)}</div>`);
            galView4=null;
        }
        if (!imgs.length) return `<div class="sci-gal"><p class="sci-hint sci-pad">В этом чате пока нет картинок.</p></div>`;
        const visible=imgs.slice(0,galLimit4);
        return `<div class="sci-galhead"><span>${imgs.length} шт.</span>${btn4(icon4('trash')+'Удалить все','data-gal-delall="1"',true)}</div><div class="sci-gal">`
            +visible.map((x)=>`<button type="button" class="sci-gi" data-gal-view="${x.mesId}:${x.vi}" aria-label="Открыть картинку"><img src="${esc(toUrl(x.f))}" alt="" loading="lazy" decoding="async"></button>`).join('')
            +`</div>${visible.length<imgs.length?`<div class="sci-row">${btn4(`Показать ещё (${imgs.length-visible.length})`,'data-gal-more="1"',true)}</div>`:''}`;
    }

    function deleteGallery4(mesId,vi) {
        const scenes=meta().scenes, sc=scenes[String(mesId)], msg=ctx().chat[mesId];
        if (!sc||!sc.vars||!sc.vars[vi]) return;
        sc.vars.splice(vi,1);
        if (sc.vars.length) { sc.idx=Math.max(0,Math.min(ival(sc.idx,0,0,sc.vars.length-1),sc.vars.length-1)); saveMeta(); if(msg)attachMedia(mesId); }
        else {
            delete scenes[String(mesId)]; saveMeta();
            if(msg&&msg.extra&&Array.isArray(msg.extra.media)){msg.extra.media=msg.extra.media.filter((m)=>!m||m.source!=='sharkimage');try{ctx().saveChat();}catch(e){}}
            renderBars();
        }
    }

    function tabApi() {
        const s = S();
        const conns = (s.api.list || []).map((cn) => sec4(null, `
            <div class="shk-conn" data-cid="${esc(cn.id)}">
                ${row4('Название', `<input class="sci-in" type="text" data-c="name" value="${esc(cn.name || '')}" placeholder="Например: OpenRouter">`)}
                ${row4('Платформа', `<select class="sci-in" data-c="platform">${PLATFORMS.map((p) => opt(p[0], cn.platform, p[1])).join('')}</select>`)}
                ${row4('Адрес API', `<input class="sci-in" type="text" data-c="base" value="${esc(cn.base || '')}" placeholder="${esc(cn.platform === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' : cn.platform === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1')}">`, 'Пусто — официальный адрес платформы. Только https (или локальная сеть).')}
                ${row4('Ключ API', `<input class="sci-in" type="password" data-c="key" value="${esc(cn.key || '')}" placeholder="sk-… / AIza…">`)}
                ${row4('Модель', `<input class="sci-in" type="text" data-c="model" value="${esc(cn.model || '')}" placeholder="например, gpt-4o-mini">`)}
                <div class="shk-mbtns">${btn4('Проверить', `data-conn-test="${esc(cn.id)}"`, true)}${btn4('Удалить', `data-conn-del="${esc(cn.id)}"`, true)}</div>
            </div>`)).join('');
        return sec4('Токены',
                row4('Токен NovelAI', `<input class="sci-in" type="password" data-tok="naiToken" value="${esc(s.naiToken)}" placeholder="pst-…">`)
                + btn4('Проверить NovelAI', 'data-check-nai="1"', true)
                + row4('Токен Naistera', `<input class="sci-in" type="password" data-tok="nsToken" value="${esc(s.nsToken)}" placeholder="токен из Telegram-бота">`)
                + row4('Прокси URL', `<input class="sci-in" type="text" data-s="proxy.url" value="${esc(s.proxy.url)}" placeholder="https://…">`)
                + sw4('Отправлять токен NovelAI в прокси', 'proxy.sendTok', s.proxy.sendTok))
            + sec4('Подключения LLM (писатель «Своё API»)', (conns || '<p class="sci-hint">Подключений нет. Добавьте OpenAI-совместимое (OpenRouter, DeepSeek и др.), Gemini или Claude.</p>')
                + btn4('Новое подключение', 'data-conn-add="1"'),
                'Ключ хранится только на этом устройстве и отправляется только на указанный адрес. В сообщения, файлы и экспорт чата он не попадает.');
    }


    function mountSettings() {
        let host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
        if (!host) return;
        let box = document.getElementById('shk_box');
        if (!box) {
            box = document.createElement('div'); box.id = 'shk_box';
            box.innerHTML = '<div class="shk-always"><div class="shk-always-head"><b>🦈 Shark Image (Tavo UI)</b></div><div class="shk-always-body"><div class="menu_button" id="shk_open_panel">Открыть панель картинок</div></div></div>';
            host.appendChild(box);
            box.querySelector('#shk_open_panel').addEventListener('click', () => { try { openShkModal(); } catch (e) { bootErr('панель', e); } });
        }
    }

    // ---------------------------------------------------------------- модальное окно настроек + кнопка в топ-баре
    // ================= TAVO UI: шторка панели + перетаскиваемая акулья кнопка =================
    let shkModal = null;
    const THEME4 = { auto: 'Как в Tavo', night: 'Ночной скетч', day: 'Альбом для рисования', bimbo: 'Бимбо · корейский пикми', glass: 'Стекло' };
    const THEME_SUB4 = { auto: 'день или ночь — как в приложении', night: 'ночная: тёмно-синий и розовый', day: 'светлая: белый и сиреневый', bimbo: 'нежная: розовый и голубой', glass: 'полупрозрачная, под любой фон' };
    function resolvedTheme4() { const t=S().theme||'auto'; if (t!=='auto') return t; try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'; } catch(e) { return 'night'; } }
    function renderModalBody() {
        if (!shkModal) return;
        const s = S();
        shkModal.setAttribute('data-sci-theme', resolvedTheme4());
        const tabs = shkModal.querySelector('.sci-tabs');
        if (tabs) tabs.innerHTML = TABS4.map((t) => `<button type="button" class="sci-tab${s.tab === t[0] || (!s.tab && t[0] === 'gen') ? ' on' : ''}" data-tab="${t[0]}" role="tab" aria-selected="${s.tab === t[0] || (!s.tab && t[0] === 'gen') ? 'true' : 'false'}">${icon4(t[1])}<span>${t[2]}</span></button>`).join('');
        const body = shkModal.querySelector('#shk_modal_body');
        if (!body) return;
        const sc = body.scrollTop;
        body.innerHTML = renderSettings();
        localize4(shkModal);
        const lp=shkModal.querySelector('[data-lang]'); if (lp) lp.textContent=(s.lang||'ru').toUpperCase();
        if (sc) body.scrollTop = sc;
    }
    function refreshAll() { mountSettings(); renderModalBody(); renderBars(); }
    function openHeadMenu(anchor, title, items) {
        const sheet = shkModal && shkModal.querySelector('.sci-sheet');
        if (!sheet) return;
        const previous = sheet.querySelector(':scope > .sci-menu');
        if (previous) previous.remove();
        const menu = document.createElement('div');
        menu.className = 'sci-menu'; menu.setAttribute('role', 'menu');
        menu.innerHTML = `<div class="sci-mtitle">${esc(title)}</div>` + items.map((it, i) => `<button type="button" class="sci-mi${it.on ? ' on' : ''}" role="menuitemradio" aria-checked="${it.on ? 'true' : 'false'}" data-mi="${i}"><span class="sci-mil"><b>${esc(it.label)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>${it.on ? `<span class="sci-mck">${icon4('check')}</span>` : ''}</button>`).join('');
        sheet.appendChild(menu);
        const sr=sheet.getBoundingClientRect(), ar=anchor.getBoundingClientRect();
        menu.style.right=Math.max(8,Math.round(sr.right-ar.right))+'px';
        menu.style.top=Math.max(8,Math.round(ar.bottom-sr.top+6))+'px';
        menu.addEventListener('click', (e) => {
            const b=e.target.closest('[data-mi]'); if (!b) return;
            e.stopPropagation(); const fn=items[Number(b.dataset.mi)].fn; menu.remove(); if (fn) fn();
        });
        const first=menu.querySelector('.sci-mi'); if (first) first.focus({preventScroll:true});
    }
    function openShkModal() {
        if (!shkModal) {
            shkModal = document.createElement('div');
            shkModal.id = 'shk_modal';
            shkModal.className = 'sci-panelroot';
            shkModal.style.display = 'none';
            shkModal.innerHTML = `<div class="sci-backdrop"></div>
                <div class="sci-sheet" role="dialog" aria-label="Shark Image">
                    <div class="sci-head">
                        <img class="sci-logo" src="${SHARK_ICON}" alt="" draggable="false">
                        <div class="sci-title"><div class="sci-trow"><b class="sci-ttl">Shark Image</b><span class="sci-saved" id="shk_saved"></span></div><span class="sci-credit">by @akula · порт в SillyTavern v${VER}</span></div>
                        <button type="button" class="sci-b" data-telegram="1" title="Telegram @NastasiaRom" aria-label="Telegram @NastasiaRom">${icon4('tg')}</button>
                        <button type="button" class="sci-hpill" data-lang-menu="1" title="Язык · Language">${icon4('globe')}<span data-lang="1">RU</span></button>
                        <button type="button" class="sci-b" data-theme-cycle="1" title="Тема" aria-label="Тема">${icon4('palette')}</button>
                        <button type="button" class="sci-b" data-close="1" title="Закрыть" aria-label="Закрыть">${icon4('close')}</button>
                    </div>
                    <div class="sci-tabs" role="tablist"></div>
                    <div class="sci-body" id="shk_modal_body"></div>
                </div>`;
            document.body.appendChild(shkModal);
            const closePanel=() => { shkModal.style.display = 'none'; const m=shkModal.querySelector('.sci-menu'); if(m)m.remove(); };
            shkModal.querySelector('.sci-backdrop').addEventListener('click', closePanel);
            shkModal.querySelector('[data-close]').addEventListener('click', closePanel);
            document.addEventListener('keydown', (e) => { if (e.key==='Escape' && shkModal && shkModal.style.display==='block') closePanel(); });
            shkModal.querySelector('[data-telegram]').addEventListener('click', () => { window.open('https://t.me/NastasiaRom','_blank','noopener'); });
            shkModal.querySelector('[data-lang-menu]').addEventListener('click', function() {
                const s=S();
                openHeadMenu(this,'Язык · Language',[['ru','Русский'],['en','English']].map((x)=>({label:x[1],on:(s.lang||'ru')===x[0],fn:()=>{s.lang=x[0];save();renderModalBody();}})));
            });
            shkModal.querySelector('[data-theme-cycle]').addEventListener('click', function() {
                const s=S();
                openHeadMenu(this,'Тема',Object.keys(THEME4).map((k)=>({label:THEME4[k],sub:THEME_SUB4[k],on:(s.theme||'auto')===k,fn:()=>{s.theme=k;save();renderModalBody();renderBars();}})));
            });
            bindSettings(shkModal);
        }
        renderModalBody();
        shkModal.style.display = 'block';
    }
    function addToolbarButton() {
        const old = document.getElementById('shk_tb');
        if (old) old.remove();
        const b = document.createElement('button');
        b.id = 'shk_tb';
        b.className = 'sci-fab';
        b.type = 'button';
        b.title = 'Открыть панель картинок';
        b.innerHTML = `<img class="sci-fabimg" src="${SHARK_ICON}" alt="" draggable="false">`;
        b.setAttribute('aria-label', 'Открыть панель картинок');
        // позиция: сохранённая или по умолчанию (правый низ, над полем ввода)
        const pos = S().fabPos;
        if (pos && typeof pos.x === 'number') { b.style.setProperty('left',pos.x+'px','important'); b.style.setProperty('top',pos.y+'px','important'); b.style.right = 'auto'; b.style.bottom = 'auto'; }
        let drag = null;
        b.addEventListener('pointerdown', (e) => {
            drag = { x0: e.clientX, y0: e.clientY, l: b.offsetLeft, t: b.offsetTop, moved: false, id: e.pointerId };
            try { b.setPointerCapture(e.pointerId); } catch (err) { }
        });
        b.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
            if (!drag.moved && Math.hypot(dx, dy) < 7) return;
            drag.moved = true;
            b.style.setProperty('left',Math.max(4, Math.min(window.innerWidth - 58, drag.l + dx)) + 'px','important');
            b.style.setProperty('top',Math.max(4, Math.min(window.innerHeight - 58, drag.t + dy)) + 'px','important');
            b.style.right = 'auto'; b.style.bottom = 'auto';
        });
        const up = (e) => {
            if (!drag) return;
            const wasDrag = drag.moved; drag = null;
            if (wasDrag) { S().fabPos = { x: b.offsetLeft, y: b.offsetTop }; save(); }
            else { try { openShkModal(); } catch (err) { bootErr('панель', err); } }
        };
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', () => { drag = null; });
        document.body.appendChild(b);
        bootLog('акулья кнопка добавлена (перетаскиваемая)');
    }

    const toast = (type, text) => { try { toastr[type](text, '🦈 Shark Image'); } catch (e) { console.log('[sharkimage]', text); } };

    function setPath(obj, path, val) {
        const p = path.split('.');
        let o = obj;
        for (let i = 0; i < p.length - 1; i++) { if (!o[p[i]]) o[p[i]] = {}; o = o[p[i]]; }
        o[p[p.length - 1]] = val;
    }
    function bindSettings(box) {
        // мини-делегатор событий без jQuery: on(evt, sel, fn)
        const on = (evt, sel, fn) => box.addEventListener(evt, (e) => { const t = e.target.closest(sel); if (t && box.contains(t)) fn.call(t, e); });
        const find1 = (sel) => box.querySelector(sel);
        on('click', '[data-tab]', function () { S().tab = this.dataset.tab; save(); refreshAll(); });
        on('click', '[data-seg]', function () { setPath(S(), this.dataset.s, this.dataset.seg); save(); refreshAll(); });
        on('click', '[data-gotoapi]', function () { S().tab = 'api'; save(); refreshAll(); });
        on('click', '[data-gal]', function () { try { window.open(this.dataset.gal, '_blank'); } catch (e) { } });
        on('click','[data-gal-view]',function(){const p=this.dataset.galView.split(':');galView4={mesId:Number(p[0]),vi:Number(p[1])};renderModalBody();});
        on('click','[data-gal-back]',function(){galView4=null;renderModalBody();});
        on('click','[data-gal-more]',function(){galLimit4+=24;renderModalBody();});
        on('click','[data-gal-download]',function(){const p=this.dataset.galDownload.split(':'),it=galleryItems4().filter((x)=>x.mesId===Number(p[0])&&x.vi===Number(p[1]))[0];if(!it)return;const a=document.createElement('a');a.href=toUrl(it.f);a.download='shark_'+(it.seed||now())+'.png';document.body.appendChild(a);a.click();a.remove();});
        on('click','[data-gal-del]',function(){if(!confirm('Удалить картинку?'))return;const p=this.dataset.galDel.split(':');deleteGallery4(Number(p[0]),Number(p[1]));galView4=null;renderModalBody();toast('info','Картинка удалена');});
        on('click','[data-gal-delall]',function(){const imgs=galleryItems4();if(!imgs.length||!confirm('Удалить все картинки этого чата ('+imgs.length+' шт.)?'))return;imgs.slice().reverse().forEach((x)=>deleteGallery4(x.mesId,x.vi));galView4=null;renderModalBody();toast('info','Удалено: '+imgs.length);});
        on('change', '[data-s]', function () {
            const s = S();
            const k = this.dataset.s;
            let v = this.type === 'checkbox' ? this.checked : this.value;
            if (['nai.steps', 'ctxN'].includes(k)) v = ival(v, k === 'ctxN' ? 4 : 28, 1, k === 'ctxN' ? 20 : 50);
            else if (k === 'nai.scale') v = clamp(v, 5, 1, 20);
            else if (k === 'nsMediumNeg') {
                s.ns.cat = this.checked ? (s.ns.cat || []).filter((x) => x.id !== s.ns.model) : [...(s.ns.cat || []).filter((x) => x.id !== s.ns.model), { id: s.ns.model, neg: false }];
                save(); return;
            }
            setPath(s, k, v);
            save(); refreshAll();
        });
        on('change', '[data-tok]', function () { S()[this.dataset.tok] = this.value.trim(); save(); });
        on('change', '[data-active]', function () { S()[this.dataset.active] = this.value; save(); refreshAll(); });
        // внешности
        on('click', '[data-look-save]', function () {
            const row = this.closest('.shk-look');
            if (!row) return;
            const lk = {
                key: row.dataset.key, kind: row.dataset.kind, id: row.dataset.id, name: row.dataset.name,
                app: row.querySelector('[data-look="app"]').value, cloth: row.querySelector('[data-look="cloth"]').value,
                g: row.querySelector('[data-look="g"]').value, alias: row.querySelector('[data-look="alias"]').value,
                neg: row.querySelector('[data-look="neg"]').value,
            };
            saveLook(lk);
            toast('success', 'Внешность «' + lk.name + '» сохранена');
            refreshAll();
        });
        on('click', '[data-look-fill]', function () {
            const row = this.closest('.shk-look');
            if (!row) return;
            const nm = row.dataset.name;
            const ch = (ctx().characters || []).filter((x) => x && l(x.name).trim() === nm)[0];
            if (!ch || !ch.description) { toast('warning', 'В карточке нет описания'); return; }
            row.querySelector('[data-look="app"]').value = cut(plainify(ch.description), 1200);
            if (!row.querySelector('[data-look="g"]').value) row.querySelector('[data-look="g"]').value = genderFrom(ch.description) || '';
            toast('info', 'Вставлено из карточки — нажми «Сохранить»');
        });
        on('click', '[data-npc-add]', function () {
            const nm = ((find1('#shk_npcname') || {}).value || '').trim();
            if (!nm) return;
            const m = meta();
            if (m.npcs.some((x) => l(x.name).toLowerCase() === nm.toLowerCase())) { toast('warning', 'Такой NPC уже есть'); return; }
            m.npcs.push({ id: uid(), name: nm, g: '', app: '', cloth: '', alias: '', neg: '' });
            saveMeta(); refreshAll();
        });
        // пресеты
        on('change', '[data-ed]', function () { const s = S(); if (!s.edit) s.edit = {}; s.edit[this.dataset.ed] = this.value; save(); refreshAll(); });
        on('change', '[data-edkind]', function () {
            const s = S(); const lb = lib();
            const p = libFind(lb.prompts, s.edit ? s.edit.tpl : null); if (!p) return;
            p.kind = KINDS.indexOf(this.value) >= 0 ? this.value : 'custom';
            saveLib(); refreshAll();
        });
        const presetArr = (edId) => edId === 'tpl' ? lib().prompts : edId === 'sty' ? lib().styles : lib().negs;
        const textField = (kind) => kind === 'style' ? 'tags' : 'text';
        on('click', '[data-preset-save]', function () {
            const edId = this.dataset.presetSave, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const cur = libFind(arr, s.edit ? s.edit[edId] : null) || arr[0];
            if (!cur) return;
            const nameEl = find1(`[data-edname="${edId}"]`), textEl = find1(`[data-edtext="${edId}"]`);
            cur.name = ((nameEl && nameEl.value) || '').trim().slice(0, 60) || cur.name;
            cur[textField(kind)] = (textEl && textEl.value) || '';
            saveLib(); toast('success', 'Сохранено'); refreshAll();
        });
        on('click', '[data-preset-new]', function () {
            const edId = this.dataset.presetNew, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const id = 'p_' + uid();
            const rec = { id, name: 'Новый', fam: provFamily(s) };
            if (kind === 'prompt') { rec.kind = 'custom'; rec.text = ''; rec.builtin = 0; }
            else { rec.tags = ''; rec.text = ''; rec.img = ''; }
            arr.push(rec);
            if (!s.edit) s.edit = {};
            s.edit[edId] = id;
            saveLib(); save(); refreshAll();
        });
        on('click', '[data-preset-dup]', function () {
            const edId = this.dataset.presetDup, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const cur = libFind(arr, s.edit ? s.edit[edId] : null) || arr[0];
            if (!cur) return;
            const copy = deep(cur); copy.id = 'p_' + uid(); copy.name = (copy.name || '—') + ' · копия';
            arr.push(copy);
            if (!s.edit) s.edit = {};
            s.edit[edId] = copy.id;
            saveLib(); save(); refreshAll();
        });
        on('click', '[data-preset-del]', function () {
            const edId = this.dataset.presetDel, kind = this.dataset.kind;
            const s = S(); const arr = presetArr(edId);
            const cur = libFind(arr, s.edit ? s.edit[edId] : null) || arr[0];
            if (!cur) return;
            if (cur.builtin) { toast('warning', 'Встроенный пресет нельзя удалить — только править'); return; }
            if (!confirm('Удалить «' + (cur.name || cur.id) + '»?')) return;
            const i = arr.indexOf(cur); arr.splice(i, 1);
            if (!s.edit) s.edit = {};
            s.edit[edId] = arr[Math.max(0, i - 1)] ? arr[Math.max(0, i - 1)].id : '';
            saveLib(); save(); refreshAll();
        });
        // API
        on('change', '[data-c]', function () {
            const row = this.closest('.shk-conn');
            if (!row) return;
            const cn = findConn(row.dataset.cid); if (!cn) return;
            cn[this.dataset.c] = this.value; save();
        });
        on('click', '[data-conn-save]', function () { save(); toast('success', 'Подключение сохранено'); });
        on('click', '[data-conn-add]', function () {
            const s = S();
            const id = 'c_' + uid();
            s.api.list.push({ id, platform: 'openai', base: '', key: '', model: '', name: 'Подключение ' + (s.api.list.length + 1) });
            s.apiId = id;
            save(); refreshAll();
        });
        on('click', '[data-conn-del]', function () {
            const s = S(); const id = this.dataset.connDel;
            if (!confirm('Удалить подключение?')) return;
            s.api.list = s.api.list.filter((x) => x.id !== id);
            if (s.apiId === id) s.apiId = (s.api.list[0] || {}).id || '';
            save(); refreshAll();
        });
        on('click', '[data-conn-test]', async function () {
            const cn = findConn(this.dataset.connTest); if (!cn) return;
            this.textContent = 'Тест…';
            try {
                await llmCall(cn, cn.key, 'Reply with the single word: ok', 'Test. Reply with: ok', 10);
                toast('success', 'Подключение работает ✓');
            } catch (e) { toast('error', 'Тест не прошёл: ' + (e && e.message ? e.message : e)); }
            this.textContent = 'Тест';
        });
        on('click', '[data-check-nai]', async function () {
            const s = S();
            if (!s.naiToken) { toast('warning', 'Сначала введи токен NovelAI'); return; }
            this.textContent = 'Проверка…';
            try {
                const res = await fetchT('https://api.novelai.net/user/subscription', { headers: { Authorization: 'Bearer ' + s.naiToken, Accept: 'application/json' } }, 30000);
                const txt = await res.text();
                if (!res.ok) throw httpErr(res, txt, 'NovelAI');
                const j = jparse(txt) || {};
                const perks = j.perks || {};
                const anlas = (j.trainingStepsLeft !== undefined) ? (j.trainingStepsMax - j.trainingStepsLeft) + ' шагов' : '—';
                toast('success', 'Токен ок. Подписка: ' + (perks.tier || j.tier || '—') + ', Anlas: ' + anlas);
            } catch (e) { toast('error', 'Проверка не прошла: ' + (e && e.message ? e.message : e)); }
            this.textContent = 'Проверить NovelAI';
        });
    }

    // ---------------------------------------------------------------- автотриггер и события
    function onCharRendered(mesId) {
        const s = S();
        if (s.mode !== 'auto' || busy.size) return;
        const id = Number(mesId);
        const m = ctx().chat[id];
        if (!m || m.is_user || m.is_system) return;
        const sc = meta().scenes[String(id)];
        if (sc && sc.status === 'done') return;
        const marker = findMarker(m.mes || '');
        if (marker) { run(id); return; }
        if (s.writer === 'api' || s.writer === 'chat') run(id, { rewrite: true });
    }
    let inited = false;
    function init() {
        bootLog('init: стартую');
        if (inited) return; inited = true;
        S(); refreshAll(); renderBars(); addToolbarButton();
        const cc = ctx(); const ev = cc.event_types || {};
        for (const name of ['USER_MESSAGE_RENDERED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'MORE_MESSAGES_LOADED', 'MESSAGE_EDITED', 'MESSAGE_DELETED', 'GENERATION_ENDED', 'GENERATION_STOPPED', 'GENERATION_STARTED']) {
            if (ev[name]) cc.eventSource.on(ev[name], () => renderBars());
        }
        if (ev.CHARACTER_MESSAGE_RENDERED) cc.eventSource.on(ev.CHARACTER_MESSAGE_RENDERED, (mesId) => { onCharRendered(mesId); renderBars(); });
        if (ev.CHAT_CHANGED) cc.eventSource.on(ev.CHAT_CHANGED, () => { LIB = null; renderBars(); if (S().tab) refreshAll(); });
        if (ev.CHAT_COMPLETION_PROMPT_READY) cc.eventSource.on(ev.CHAT_COMPLETION_PROMPT_READY, inlineInjection);
        document.addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('#chat .shk-b');
            if (!b) return;
            e.preventDefault(); e.stopPropagation();
            const mesEl = b.closest('.mes');
            const id = Number(mesEl && mesEl.getAttribute('mesid')); if (Number.isNaN(id)) return;
            barAction(id, b.dataset.act);
        });
        // запасной триггер авто-рисования, если события Таверны не приходят: следим за ростом чата
        try {
            let lastLen = (cc.chat || []).length;
            setInterval(() => {
                try {
                    const ch = ctx().chat || [];
                    if (ch.length !== lastLen) {
                        lastLen = ch.length;
                        renderBars();
                        if (ch.length && !ch[ch.length - 1].is_user && !ch[ch.length - 1].is_system) onCharRendered(ch.length - 1);
                    }
                } catch (e) { }
            }, 1500);
        } catch (e) { }
        bootLog('init: загружен ✔ акулья кнопка готова');
        console.log('[sharky4] Shark Image v' + VER + ' загружен');
    }
    // старт: ждём, пока API SillyTavern реально станет доступен (до 30 c), потом init
    (function boot() {
        bootLog('жду API SillyTavern…');
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            if (ctxOk()) {
                clearInterval(timer);
                bootLog('API SillyTavern на месте');
                try {
                    const cc = ctx();
                    if (cc.event_types && cc.event_types.APP_READY && cc.eventSource) cc.eventSource.on(cc.event_types.APP_READY, () => { try { init(); } catch (e) { bootErr('init', e); } });
                } catch (e) { bootErr('старт', e); }
                try { if (!inited) init(); } catch (e) { bootErr('init', e); }
                if (!inited && tries < 20) return; // init отложен на APP_READY
                if (!inited) { try { init(); } catch (e) { bootErr('init', e); } }
            } else if (tries >= 60) {
                clearInterval(timer);
                bootErr('старт', new Error('SillyTavern API не появился за 30 секунд — расширение загружено до Таверны? Перезагрузи страницу'));
            }
        }, 500);
        // если через 5 c API так и не встал — всё равно попробуем init напрямую
        setTimeout(() => { if (!inited) { try { init(); } catch (e) { bootErr('init', e); } } }, 5000);
    })();

    // отладочный доступ для тестов (внешне ничего не меняет)
    if (typeof window !== 'undefined') {
        window.__sharkTest = { compose, parseMarker, findMarker, negFilter, applyGuards, wordKeys, mentions, genderFrom, stripConflicts, lookTags, unpackZip, memoFromTags, cleanLook, qTags, ucPreset, E, O, I, hasText, normTag, xmerge, w, cut, renderSettings, tabMain, tabLooks, tabPresets, tabApi, S, lib, activePrompt, activeStyle, activeNeg, collectLooks, storyContext, charsList, cardTexts, sceneOf, meta, naiGenerate, nsGenerate, proxyGenerate, llmCall, apiWrite, chatWrite };
    }
})();
