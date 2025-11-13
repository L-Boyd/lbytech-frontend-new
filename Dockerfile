# 使用轻量级的Nginx作为Web服务器
FROM nginx:alpine

# 删除默认的Nginx配置文件
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义Nginx配置文件
COPY nginx.conf /etc/nginx/conf.d/

# 复制前端文件到Nginx的html目录
COPY . /usr/share/nginx/html

# 暴露80端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]